// buildSnapshot(): llama a todos los conectores en paralelo, calcula y devuelve un Snapshot (sección 11).
import 'server-only';
import { createHash } from 'node:crypto';
import {
  CONDICIONES, ESCENARIOS, FUENTES, POLYMARKET, PROVEEDORES, SIMBOLOS, UMBRALES, VIDEO, env, urlVideo,
} from './config';
import type {
  Condicion, ConnectorResult, DetalleProveedor, HorizontePolymarket, Indicador, Punto, SaludConector, Semaforo, Snapshot,
} from './types';
import { yahoo, type SerieYahoo } from './connectors/yahoo';
import { fred } from './connectors/fred';
import { polymarketEvento, polymarketHistorial, type EventoPM } from './connectors/polymarket';
import { secConcepto, trimestrales } from './connectors/sec';
import { siliconData } from './connectors/silicondata';
import { cargarManual, type DatosManuales } from './connectors/manual';
import { drawdown, infoDrawdown, serieDrawdown, variacion, variacionDias, clamp } from './calc/drawdown';
import { detectarSucesos, diasC4, estadoCondicion, rachaActualC4, sucesosPrecio } from './calc/condiciones';
import { evaluarVentana, type Suceso } from './calc/ventana';
import { calcularIRP, divergencia, normBono, normC4, normFed, normGravedad, normLab, normOpv, normSemaforo } from './calc/irp';
import { diagnosticar } from './calc/escenario';
import { fraseDelDia } from './calc/frase';
import { peorRacha } from './calc/r42';
import { addDays, businessDaysBetween, hoyEn } from './calc/fechas';
import { preferirXbrl } from './calc/ciclo';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Eventos de Polymarket descubiertos por J2 (data/auto/polymarket_eventos.json) unidos a la configuración. */
function eventosPolymarket(): string[] {
  try {
    const j = JSON.parse(readFileSync(path.join(process.cwd(), 'data/auto/polymarket_eventos.json'), 'utf8'));
    const extra = Array.isArray(j.items) ? j.items.map((i: { slug?: unknown }) => String(i.slug ?? '')).filter(Boolean) : [];
    return Array.from(new Set([...POLYMARKET.eventos, ...extra]));
  } catch {
    return [...POLYMARKET.eventos];
  }
}
import { aPuntos, compactar, desde, valorEn } from './calc/series';
import { fecha as fFecha, mesAnio, musd, num, pct, pp, usd, usdGrande } from './calc/formato';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

type Lab = 'normal' | 'tension' | 'evento';
const peor = (...s: Semaforo[]): Semaforo => {
  const orden: Semaforo[] = ['rojo', 'naranja', 'ambar', 'verde'];
  for (const o of orden) if (s.includes(o)) return o;
  return 'sin_dato';
};
const semGravedad = (g: number | null): Semaforo => (g === null || g === 0 ? 'verde' : g >= 3 ? 'rojo' : 'ambar');
const citaDe = (manual: DatosManuales, t: number, texto?: string) => {
  const c = manual.citas.items.find((x) => x.t === t);
  return { texto: texto ?? c?.afirmacion ?? '', t };
};
const fuenteYahoo = (s: string) => ({ nombre: FUENTES.yahoo.nombre, url: `${FUENTES.yahoo.url}${encodeURIComponent(s)}`, manual: false, verificado: true });
const fuenteVideo = (t: number) => ({ nombre: 'Vídeo de Juan Ramón Rallo (dato manual)', url: urlVideo(t), manual: true, verificado: false });
const iso = (d: string | null) => (d ? `${d}T21:00:00Z` : null);

function base(p: Partial<Indicador> & Pick<Indicador, 'id' | 'modulo' | 'nombre' | 'unidad' | 'ayuda' | 'fuente'>): Indicador {
  return { valor: null, semaforo: 'sin_dato', actualizadoEn: null, stale: false, ...p };
}

/** Antigüedad de una serie de mercado en días hábiles y su estado (sección 18.1: 2 → 5). */
function frescura(ultima: string | null, hoy: string, stale = 2, sinDato = 5) {
  if (!ultima) return { stale: false, sinDato: true, edad: null as number | null };
  const edad = businessDaysBetween(hoy, ultima);
  return { stale: edad > stale, sinDato: edad > sinDato, edad };
}

function semaforoBajada(v: number | null, ambar: number, rojo: number): Semaforo {
  if (v === null) return 'sin_dato';
  if (v <= rojo) return 'rojo';
  if (v <= ambar) return 'ambar';
  return 'verde';
}

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------

export function fechaHoy(): string {
  if (env.hoy()) return env.hoy();
  if (env.mock()) return '2026-11-21';
  return hoyEn('America/New_York');
}

export async function buildSnapshot(): Promise<Snapshot> {
  const hoy = fechaHoy();
  const manual = cargarManual();

  const simbolos = [
    SIMBOLOS.nasdaq, SIMBOLOS.nvda, SIMBOLOS.soxx, SIMBOLOS.sox, ...SIMBOLOS.proveedores,
    ...SIMBOLOS.componentesSoxx.filter((s) => !['NVDA', 'AVGO', 'TSM'].includes(s)),
    SIMBOLOS.etfGlobal, SIMBOLOS.anthropic, SIMBOLOS.ipo, SIMBOLOS.tnx,
  ];
  const [yRes, fredRes, pmRes, secRes, sdRes] = await Promise.all([
    Promise.allSettled(simbolos.map((s) => yahoo(s))),
    Promise.allSettled(['DGS10', 'DFEDTARU', 'DFEDTARL'].map((s) => fred(s))),
    Promise.allSettled(eventosPolymarket().map((e) => polymarketEvento(e))),
    Promise.allSettled([
      secConcepto('us-gaap', 'Revenues'),
      secConcepto('us-gaap', 'GuaranteeObligationsMaximumExposure'),
      secConcepto('dei', 'EntityCommonStockSharesOutstanding'),
    ]),
    Promise.allSettled([siliconData('h100'), siliconData('b200')]),
  ]);
  const okDe = <T,>(r: PromiseSettledResult<ConnectorResult<T>>): ConnectorResult<T> =>
    r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason), source: '?', fetchedAt: new Date().toISOString() };

  const Y = new Map<string, ConnectorResult<SerieYahoo>>();
  simbolos.forEach((s, i) => Y.set(s, okDe(yRes[i])));
  // Respaldo del ETF global en Xetra si falla el de Londres.
  if (!Y.get(SIMBOLOS.etfGlobal)?.ok) Y.set(SIMBOLOS.etfGlobal, await yahoo(SIMBOLOS.etfGlobalRespaldo));

  const serieY = (s: string): Array<{ date: string; close: number }> => {
    const r = Y.get(s);
    return r && r.ok ? r.data.points.filter((p) => p.date <= hoy) : [];
  };
  const staleY = (s: string) => {
    const r = Y.get(s);
    return !!(r && r.ok && r.stale);
  };
  /** Fecha del dato (último cierre, 22:00 en Madrid ≈ 21:00 UTC), no la hora de la descarga. */
  const fechaY = (s: string) => {
    const r = Y.get(s);
    if (!r || !r.ok || !r.data.points.length) return null;
    const ult = r.data.points.filter((p) => p.date <= hoy).pop();
    return ult ? `${ult.date}T21:00:00Z` : null;
  };

  const F_ = (i: number) => okDe(fredRes[i]);
  const dgs10 = F_(0);
  const fedU = F_(1);
  const fedL = F_(2);
  const [revR, garR, accR] = [okDe(secRes[0]), okDe(secRes[1]), okDe(secRes[2])];
  const sdH100 = okDe(sdRes[0]);
  const sdB200 = okDe(sdRes[1]);

  // ---------------- Polymarket ----------------
  const eventos: EventoPM[] = [];
  let pmOk = true;
  let pmError: string | undefined;
  let pmFetched = new Date().toISOString();
  let pmStale = false;
  for (const r of pmRes) {
    const v = okDe(r);
    if (v.ok) {
      eventos.push(...v.data);
      pmFetched = v.fetchedAt;
      pmStale = pmStale || !!v.stale;
    } else {
      pmOk = false;
      pmError = v.error;
    }
  }
  const mercados = eventos.flatMap((e) => e.mercados);
  const abiertos = mercados.filter((m) => !m.cerrado).sort((a, b) => a.fin.localeCompare(b.fin));
  const cerrados = mercados.filter((m) => m.cerrado);
  const horizontes: HorizontePolymarket[] = [];
  for (const m of abiertos) {
    let serie: Punto[] = [];
    if (m.tokenSi) {
      const h = await polymarketHistorial(m.tokenSi);
      if (h.ok) serie = h.data;
    }
    horizontes.push({ slug: m.slug, titulo: m.titulo, fin: m.fin, probSi: m.probSi, volumen: m.volumen, serie, cerrado: false, resultado: null });
  }
  const resueltos: HorizontePolymarket[] = cerrados.map((m) => {
    const iSi = m.outcomes.findIndex((o) => o.toLowerCase() === 'yes');
    const pSi = m.precios && iSi >= 0 ? m.precios[iSi] : null;
    const resultado = pSi === 1 ? 'Sí' : pSi === 0 ? 'No' : null;
    return { slug: m.slug, titulo: m.titulo, fin: m.fin, probSi: pSi, volumen: m.volumen, serie: [], cerrado: true, resultado };
  });
  const principal = horizontes[0] ?? null;
  // D5: la fecha límite es el endDate del mercado principal; sin mercado abierto, ventana móvil que termina hoy.
  const limite = principal?.fin || (eventos.length ? hoy : CONDICIONES.limitePorDefecto);
  const reglamento = eventos[0]?.descripcion ?? null;
  const hashReglas = reglamento ? createHash('sha256').update(reglamento).digest('hex') : null;
  const reglasCambiadas = !!(manual.reglasSha && hashReglas && manual.reglasSha !== hashReglas);

  const indicadores: Record<string, Indicador> = {};
  const add = (i: Indicador) => (indicadores[i.id] = i);

  // ---------------------------------------------------------------------------
  // Condiciones de precio c1–c3
  // ---------------------------------------------------------------------------
  const condPrecio = (simbolo: string, u: number) => {
    const s = serieY(simbolo);
    const info = infoDrawdown(s, u);
    const suc = s.length ? sucesosPrecio(s, u, hoy) : null;
    const fr = frescura(info?.fecha ?? null, hoy);
    const dd = serieDrawdown(s, u);
    const umbral = dd.map((p) => ({ date: p.date, value: Math.round(p.umbral * 100) / 100 }));
    return { s, info, suc, fr, umbral };
  };

  const textosAyuda = {
    c1: 'Nvidia diseña la mayoría de los chips con los que se entrena y ejecuta la IA. Su cotización resume la apuesta del mercado sobre cuánto se seguirá invirtiendo en IA.',
    c2: 'SOXX agrupa las 30 mayores empresas de semiconductores cotizadas en EE. UU., con un peso máximo por empresa. Indica si la caída es de una sola empresa o de todo el sector.',
    c3: 'TSMC fabrica los chips, ASML hace las máquinas de litografía, Broadcom diseña chips a medida y equipos de red, Arista hace redes y Supermicro monta servidores.',
    c4: 'Es probablemente el indicador más significativo: mide lo que se paga hora a hora por usar los chips. Si sobrara capacidad, sería el primer precio en hundirse.',
    c5: 'Los laboratorios alquilan casi toda la capacidad de cómputo. Su quiebra sería un pinchazo de la economía real.',
    c6: 'Una adquisición de OpenAI sería una venta de urgencia: que no pueda sobrevivir por sí sola.',
  };

  const limite90 = addDays(hoy, -CONDICIONES.ventanaDias);
  const ult90 = (f: string[]) => f.some((x) => x >= limite90);

  function condicionPrecio(id: 'c1' | 'c2', simbolo: string, u: number, nombre: string, t: number): Condicion {
    const { s, info, suc, fr, umbral } = condPrecio(simbolo, u);
    const sinDato = !info || fr.sinDato;
    const estado = estadoCondicion({
      sinDato,
      cumplidaHoy: info?.cumplidaHoy ?? null,
      heredada: suc?.heredada ?? false,
      sucesoUlt90: suc ? ult90(suc.sucesos) : false,
      proximidad: info?.proximidad ?? null,
    });
    const anio = addDays(hoy, -365);
    return {
      ...base({
        id, modulo: 'M3', nombre, unidad: 'USD', ayuda: textosAyuda[id], fuente: fuenteYahoo(simbolo),
        citaVideo: citaDe(manual, t),
      }),
      valor: info?.close ?? null,
      valorTexto: info ? usd(info.close) : undefined,
      serie: aPuntos(desde(s, anio)),
      series: { umbral: desde(umbral, anio), completa: compactar(aPuntos(s)) },
      semaforo: estado === 'cumplida' ? 'rojo' : estado === 'muy_cerca' ? 'naranja' : estado === 'vigilancia' ? 'ambar' : estado === 'lejos' ? 'verde' : 'sin_dato',
      proximidad: sinDato ? null : info!.proximidad,
      umbrales: { verde: `proximidad < 60`, ambar: `proximidad 60–85`, rojo: `cierre ≤ ${num((1 - u) * 100, 0)} % del máximo`, propuesto: false },
      actualizadoEn: info ? fechaY(simbolo) : null,
      stale: staleY(simbolo) || fr.stale,
      bloque: 'financiero',
      estado,
      cumplidaHoy: info?.cumplidaHoy ?? null,
      fechaSuceso: suc?.fechaSuceso ?? null,
      sucesos: suc?.sucesos ?? [],
      heredada: suc?.heredada ?? false,
      cumplidaDesde: suc?.cumplidaDesde ?? null,
      recuperada: suc?.recuperada ?? false,
      precioUmbral: info?.precioUmbral ?? null,
      distanciaRestante: info?.distancia ?? null,
      extra: info ? { ath: info.ath, athFecha: info.athFecha, dd: info.dd, fecha: info.fecha, u } : { u },
    };
  }

  const c1 = condicionPrecio('c1', SIMBOLOS.nvda, CONDICIONES.umbralNvda, 'NVDA −50 % desde su máximo', 228);
  const c2 = condicionPrecio('c2', SIMBOLOS.soxx, CONDICIONES.umbralSoxx, 'SOXX −40 % desde su máximo', 235);

  // c3: cualquier proveedor −50 % (con cruce no heredado). Cuenta como una sola condición.
  const detalle: DetalleProveedor[] = [];
  let c3Stale = false;
  const c3Sucesos: string[] = [];
  for (const t of SIMBOLOS.proveedores) {
    const { info, suc, fr } = condPrecio(t, CONDICIONES.umbralProveedor);
    if (!info || !suc || fr.sinDato) continue;
    c3Stale = c3Stale || staleY(t) || fr.stale;
    c3Sucesos.push(...suc.sucesos);
    detalle.push({
      ticker: t, nombre: PROVEEDORES[t].nombre, papel: PROVEEDORES[t].papel, ath: info.ath, athFecha: info.athFecha,
      close: info.close, fecha: info.fecha, dd: info.dd, umbral: info.precioUmbral, distancia: info.distancia,
      proximidad: info.proximidad, heredada: suc.heredada, cumplidaDesde: suc.cumplidaDesde, fechaSuceso: suc.fechaSuceso,
    });
  }
  detalle.sort((a, b) => (a.heredada === b.heredada ? b.proximidad - a.proximidad : a.heredada ? 1 : -1));
  const noHeredados = detalle.filter((d) => !d.heredada);
  const c3Prox = noHeredados.length ? Math.max(...noHeredados.map((d) => d.proximidad)) : null;
  const c3CumpleHoy = noHeredados.some((d) => d.close <= d.umbral);
  c3Sucesos.sort();
  const masCercano = noHeredados[0];
  const c3Estado = estadoCondicion({ sinDato: c3Prox === null, cumplidaHoy: c3CumpleHoy, heredada: false, sucesoUlt90: ult90(c3Sucesos), proximidad: c3Prox });
  const serieCercano = masCercano ? condPrecio(masCercano.ticker, 0.5) : null;
  const c3: Condicion = {
    ...base({ id: 'c3', modulo: 'M3', nombre: 'Algún proveedor −50 % desde su máximo', unidad: 'USD', ayuda: textosAyuda.c3, fuente: fuenteYahoo(masCercano?.ticker ?? 'AVGO'), citaVideo: citaDe(manual, 246) }),
    valor: masCercano?.close ?? null,
    valorTexto: masCercano ? `${masCercano.nombre}: ${usd(masCercano.close)}` : undefined,
    serie: serieCercano ? aPuntos(desde(serieCercano.s, addDays(hoy, -365))) : undefined,
    series: serieCercano ? { umbral: desde(serieCercano.umbral, addDays(hoy, -365)) } : undefined,
    semaforo: c3Estado === 'cumplida' ? 'rojo' : c3Estado === 'muy_cerca' ? 'naranja' : c3Estado === 'vigilancia' ? 'ambar' : c3Estado === 'lejos' ? 'verde' : 'sin_dato',
    proximidad: c3Prox,
    umbrales: { verde: 'proximidad < 60', ambar: 'proximidad 60–85', rojo: 'cierre ≤ 50 % del máximo', propuesto: false },
    actualizadoEn: fechaY(SIMBOLOS.proveedores[0]),
    stale: c3Stale,
    bloque: 'financiero',
    estado: c3Estado,
    cumplidaHoy: c3Prox === null ? null : c3CumpleHoy,
    fechaSuceso: c3Sucesos[0] ?? null,
    sucesos: c3Sucesos,
    heredada: false,
    precioUmbral: masCercano?.umbral ?? null,
    distanciaRestante: masCercano?.distancia ?? null,
    detalle,
    notas: detalle.filter((d) => d.heredada).map((d) => `${d.nombre}: cumplida desde ${fFecha(d.cumplidaDesde)}; Polymarket y el vídeo no la cuentan como suceso nuevo.`),
    extra: { masCercano: masCercano?.ticker ?? null },
  };

  // ---------------------------------------------------------------------------
  // c4: alquiler de la H100 (Silicon Data oficial; CSV manual si no hay clave; proxy IAA)
  // ---------------------------------------------------------------------------
  const manualH100 = new Map<string, { value: number; verificado: boolean; fuente: string }>();
  for (const f of manual.gpu.filter((g) => g.gpu === 'h100' && g.usd_hora !== null)) {
    const prev = manualH100.get(f.fecha);
    if (!prev || (f.verificado && !prev.verificado)) manualH100.set(f.fecha, { value: f.usd_hora!, verificado: f.verificado, fuente: f.fuente });
  }
  const usaApi = sdH100.ok;
  const h100: Punto[] = usaApi
    ? sdH100.data.filter((p) => p.date <= hoy)
    : Array.from(manualH100.entries()).filter(([d]) => d <= hoy).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, value: v.value }));
  const h100Ult = h100[h100.length - 1] ?? null;
  const h100Verif = usaApi ? true : h100Ult ? manualH100.get(h100Ult.date)?.verificado ?? false : false;
  const frH100 = frescura(h100Ult?.date ?? null, hoy, 3, 7);
  const pRef = h100.length ? Math.max(...desde(h100, addDays(hoy, -365)).map((p) => p.value)) : null;
  const d30 = variacionDias(h100, 30, h100Ult?.date);
  const d90 = variacionDias(h100, 90, h100Ult?.date);
  const dDic = (() => {
    const b = valorEn(h100, '2025-12-01');
    return b && h100Ult ? h100Ult.value / b.value - 1 : null;
  })();
  const d12m = variacionDias(h100, 365, h100Ult?.date);
  const c4Dias = diasC4(h100);
  const c4Suc = detectarSucesos(c4Dias, hoy);
  const racha = rachaActualC4(h100);
  // Proxy abierto (IAA neo H100), que nunca cuenta para X/6.
  const iaa = manual.gpuAbierto.filter((r) => r.gpu.toLowerCase().startsWith('h100') && r.lectura === 'neo').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const iaaUlt = iaa[iaa.length - 1] ?? null;
  const oficialReciente = !!h100Ult && !frH100.sinDato;
  const usaProxy = !oficialReciente && !!iaaUlt && businessDaysBetween(hoy, iaaUlt.fecha) <= 5;
  const c4Norm = oficialReciente
    ? normC4(h100Ult!.value, pRef, d90)
    : usaProxy
      ? normC4(iaaUlt!.valor, Math.max(...iaa.filter((r) => r.fecha >= addDays(hoy, -365)).map((r) => r.valor)), null)
      : null;
  const c4Estado = estadoCondicion({
    sinDato: !oficialReciente && !usaProxy,
    cumplidaHoy: oficialReciente ? c4Dias[c4Dias.length - 1]?.cumplida ?? false : false,
    heredada: c4Suc.heredada,
    sucesoUlt90: ult90(c4Suc.sucesos),
    proximidad: c4Norm,
  });
  const c4: Condicion = {
    ...base({
      id: 'c4', modulo: 'M3', nombre: 'H100 ≤ 1 $/h durante 5 días seguidos', unidad: 'USD/h', ayuda: textosAyuda.c4,
      fuente: usaApi
        ? { nombre: FUENTES.silicondata.nombre, url: FUENTES.silicondata.url, manual: false, verificado: true }
        : { nombre: `${FUENTES.silicondata.nombre} (dato manual)`, url: FUENTES.silicondata.url, manual: true, verificado: h100Verif },
      citaVideo: citaDe(manual, 262),
    }),
    valor: oficialReciente ? h100Ult!.value : usaProxy ? iaaUlt!.valor : null,
    valorTexto: oficialReciente ? `${num(h100Ult!.value, 2)} $/h` : usaProxy ? `${num(iaaUlt!.valor, 2)} $/h (proxy)` : undefined,
    serie: h100,
    series: { umbral: h100.map((p) => ({ date: p.date, value: 1 })), proxy: iaa.map((r) => ({ date: r.fecha, value: r.valor })) },
    semaforo: c4Estado === 'cumplida' ? 'rojo' : c4Estado === 'muy_cerca' ? 'naranja' : c4Estado === 'vigilancia' ? 'ambar' : c4Estado === 'lejos' ? 'verde' : 'sin_dato',
    proximidad: c4Norm,
    umbrales: { verde: 'proximidad < 60', ambar: 'proximidad 60–85', rojo: '5 días seguidos ≤ 1,00 $/h', propuesto: false },
    actualizadoEn: iso(h100Ult?.date ?? null),
    stale: frH100.stale,
    bloque: 'real',
    estado: c4Estado,
    cumplidaHoy: oficialReciente ? c4Dias[c4Dias.length - 1]?.cumplida ?? false : null,
    fechaSuceso: c4Suc.fechaSuceso,
    sucesos: c4Suc.sucesos,
    heredada: c4Suc.heredada,
    precioUmbral: 1,
    distanciaRestante: oficialReciente ? 1 / h100Ult!.value - 1 : null,
    usaProxy,
    notas: [
      ...(usaProxy ? ['Proxy abierto (no oficial): no cuenta para el criterio de Polymarket.'] : []),
      ...(!usaApi ? ['Sin clave de Silicon Data: se usan los valores publicados en su página, registrados a mano o por el investigador.'] : []),
    ],
    extra: { racha, pRef, d30, d90, dDic, d12m, oficial: usaApi ? 'api' : 'manual' },
  };

  // ---------------------------------------------------------------------------
  // c5 / c6: eventos de los laboratorios (solo verificados)
  // ---------------------------------------------------------------------------
  const evs = manual.eventos.items.filter((e) => e.verificado);
  const evC5 = evs.filter((e) => e.tipo === 'quiebra').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const evC6 = evs.filter((e) => e.tipo === 'adquisicion_openai' && e.entidad === 'OpenAI').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const labEstado = (lab: 'OpenAI' | 'Anthropic'): Lab => manual.laboratorios.items.find((l) => l.lab === lab)?.estado ?? 'normal';
  let candidatos: Array<Record<string, unknown>> = [];
  try {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    candidatos = JSON.parse(readFileSync(path.join(process.cwd(), 'data/auto/candidatos_c56.json'), 'utf8')).items ?? [];
  } catch {
    candidatos = [];
  }
  function condLab(id: 'c5' | 'c6', ev: typeof evC5, estados: Lab[], nombre: string, t: number): Condicion {
    const peorEstado: Lab = ev.length ? 'evento' : estados.includes('evento') ? 'evento' : estados.includes('tension') ? 'tension' : 'normal';
    const prox = normLab(peorEstado)!;
    const fechas = ev.map((e) => e.fecha).filter((f) => f >= addDays(hoy, -CONDICIONES.horizonteDias) && f <= hoy);
    const cumplida = ev.length > 0;
    const enInvestigacion = candidatos.some((c) => c.condicion === id);
    return {
      ...base({ id, modulo: 'M3', nombre, unidad: 'texto', ayuda: textosAyuda[id], fuente: { nombre: 'Registro de eventos verificados (data/manual/eventos.json)', url: ev[0]?.fuente_url ?? urlVideo(t), manual: true, verificado: true }, citaVideo: citaDe(manual, t) }),
      valor: prox,
      valorTexto: cumplida ? `Sí: ${ev[0].titulo}` : peorEstado === 'tension' ? 'No (laboratorio en tensión)' : 'No',
      semaforo: cumplida ? 'rojo' : peorEstado === 'tension' ? 'ambar' : 'verde',
      proximidad: prox,
      actualizadoEn: new Date().toISOString(),
      bloque: 'real',
      estado: cumplida ? 'cumplida' : prox >= 85 ? 'muy_cerca' : prox >= 50 ? 'vigilancia' : 'lejos',
      cumplidaHoy: cumplida,
      fechaSuceso: fechas[0] ?? null,
      sucesos: fechas,
      heredada: false,
      enInvestigacion,
      notas: enInvestigacion ? ['Posible suceso en investigación: no cuenta hasta que se verifique.'] : [],
      extra: { estado: peorEstado, eventos: ev },
    };
  }
  const c5 = condLab('c5', evC5, [labEstado('OpenAI'), labEstado('Anthropic')], 'Quiebra de OpenAI o Anthropic', 276);
  const c6 = condLab('c6', evC6, [labEstado('OpenAI')], 'OpenAI es adquirida', 279);
  const condiciones = [c1, c2, c3, c4, c5, c6];

  // ---------------------------------------------------------------------------
  // Ventana de 90 días
  // ---------------------------------------------------------------------------
  const sucesos: Suceso[] = condiciones.flatMap((c) => c.sucesos.map((f) => ({ cond: c.id, fecha: f })));
  const v = evaluarVentana(sucesos, limite);
  const ventana = { ...v, limite, sucesos };

  // ---------------------------------------------------------------------------
  // M1 — Termómetro
  // ---------------------------------------------------------------------------
  const ixic = serieY(SIMBOLOS.nasdaq);
  const ixicInfo = infoDrawdown(ixic, 0.2);
  const ixicD1 = variacion(ixic, 1);
  const ixicD5 = variacion(ixic, 5);
  const frIxic = frescura(ixicInfo?.fecha ?? null, hoy);
  add(base({
    id: 'I01', modulo: 'M1', nombre: 'Nasdaq Composite: caída desde el máximo', unidad: '%',
    ayuda: 'Se habla de mercado bajista cuando un índice cae un 20 % o más desde su máximo.', fuente: fuenteYahoo('^IXIC'),
    citaVideo: citaDe(manual, 11),
    valor: ixicInfo && !frIxic.sinDato ? ixicInfo.dd : null,
    valorTexto: ixicInfo ? pct(ixicInfo.dd) : undefined,
    serie: aPuntos(desde(ixic, addDays(hoy, -365))),
    series: { completa: compactar(aPuntos(ixic)) },
    semaforo: frIxic.sinDato ? 'sin_dato' : semaforoBajada(ixicInfo?.dd ?? null, UMBRALES.I01.ambar, UMBRALES.I01.rojo),
    umbrales: { verde: '> −10 %', ambar: '−10 % a −20 % (corrección)', rojo: '≤ −20 % (mercado bajista)', propuesto: false },
    actualizadoEn: fechaY('^IXIC'), stale: staleY('^IXIC') || frIxic.stale,
    extra: { d1: ixicD1, d5: ixicD5, ath: ixicInfo?.ath, athFecha: ixicInfo?.athFecha, close: ixicInfo?.close, fecha: ixicInfo?.fecha },
  }));
  add(base({
    id: 'I02', modulo: 'M1', nombre: 'Nasdaq: variación diaria y semanal', unidad: '%',
    ayuda: 'El viernes 20/11/2026 cayó un 5,3 % en una sesión y más del 10 % en la semana.', fuente: fuenteYahoo('^IXIC'),
    citaVideo: citaDe(manual, 0),
    valor: frIxic.sinDato ? null : ixicD1, valorTexto: `${pct(ixicD1, 1, true)} (1 día) · ${pct(ixicD5, 1, true)} (5 días)`,
    semaforo: frIxic.sinDato ? 'sin_dato' : peor(semaforoBajada(ixicD1, UMBRALES.I02diaria.ambar, UMBRALES.I02diaria.rojo), semaforoBajada(ixicD5, UMBRALES.I02semanal.ambar, UMBRALES.I02semanal.rojo)),
    umbrales: { verde: 'diaria > −2 %; semanal > −5 %', ambar: 'diaria −2 % a −4 %; semanal −5 % a −10 %', rojo: 'diaria ≤ −4 %; semanal ≤ −10 %', propuesto: true },
    actualizadoEn: fechaY('^IXIC'), stale: staleY('^IXIC') || frIxic.stale,
    extra: {
      d1: ixicD1, d5: ixicD5,
      semaforoD1: semaforoBajada(ixicD1, UMBRALES.I02diaria.ambar, UMBRALES.I02diaria.rojo),
      semaforoD5: semaforoBajada(ixicD5, UMBRALES.I02semanal.ambar, UMBRALES.I02semanal.rojo),
    },
  }));

  const nvda = serieY(SIMBOLOS.nvda);
  const nvdaInfo = infoDrawdown(nvda, 0.5);
  const nvdaD5 = variacion(nvda, 5);
  const nvdaD1 = variacion(nvda, 1);
  const acciones = accR.ok && accR.data.length ? accR.data[accR.data.length - 1].val : null;
  const capSemana = acciones && nvda.length > 5 ? (nvda[nvda.length - 6].close - nvda[nvda.length - 1].close) * acciones : null;
  const capATH = acciones && nvdaInfo ? (nvdaInfo.ath - nvdaInfo.close) * acciones : null;
  const frNvda = frescura(nvdaInfo?.fecha ?? null, hoy);
  add(base({
    id: 'I03', modulo: 'M1', nombre: 'NVDA: variación semanal y capitalización perdida', unidad: '%',
    ayuda: 'El vídeo cifra en más de 1 billón de dólares la pérdida semanal y en casi 3 billones la pérdida desde máximos.',
    fuente: { nombre: `${FUENTES.yahoo.nombre} y SEC EDGAR (acciones en circulación)`, url: `${FUENTES.yahoo.url}NVDA`, manual: false, verificado: true },
    citaVideo: citaDe(manual, 24),
    valor: frNvda.sinDato ? null : nvdaD5, valorTexto: pct(nvdaD5, 1, true),
    serie: aPuntos(desde(nvda, addDays(hoy, -365))),
    semaforo: frNvda.sinDato ? 'sin_dato' : semaforoBajada(nvdaD5, UMBRALES.I03semanal.ambar, UMBRALES.I03semanal.rojo),
    umbrales: { verde: '> −8 %', ambar: '−8 % a −15 %', rojo: '≤ −15 %', propuesto: true },
    actualizadoEn: fechaY('NVDA'), stale: staleY('NVDA') || frNvda.stale,
    extra: { d1: nvdaD1, d5: nvdaD5, dd: nvdaInfo?.dd, capPerdidaSemana: capSemana, capPerdidaDesdeATH: capATH, acciones, capPerdidaSemanaTexto: usdGrande(capSemana), capPerdidaDesdeATHTexto: usdGrande(capATH) },
  }));

  // ---------------------------------------------------------------------------
  // M2 — Polymarket
  // ---------------------------------------------------------------------------
  const horizonte2026 = horizontes.find((h) => h.slug === POLYMARKET.slugPrincipal2026) ?? principal;
  const semPM = (p: number | null): Semaforo => (p === null ? 'sin_dato' : p >= POLYMARKET.umbrales.rojo ? 'rojo' : p >= POLYMARKET.umbrales.verde ? 'ambar' : 'verde');
  const saltos = (s: Punto[]) => s.slice(1).map((p, i) => ({ date: p.date, pp: (p.value - s[i].value) * 100 })).filter((x) => Math.abs(x.pp) >= POLYMARKET.saltoAnotacionPp);
  add(base({
    id: 'I04', modulo: 'M2', nombre: `Probabilidad de pinchazo: ${horizonte2026?.titulo ?? 'sin mercado activo'}`, unidad: '%',
    ayuda: 'Polymarket es un mercado de predicciones: el contrato «Sí» paga 1 $ si ocurre el suceso. Si cotiza a 0,55 $, el mercado asigna un 55 % de probabilidad.',
    fuente: { nombre: FUENTES.polymarket.nombre, url: FUENTES.polymarket.url, manual: false, verificado: true }, citaVideo: citaDe(manual, 53),
    valor: horizonte2026?.probSi ?? null, valorTexto: horizonte2026?.probSi != null ? pct(horizonte2026.probSi, 1) : undefined,
    serie: desde(horizonte2026?.serie ?? [], addDays(hoy, -90)),
    semaforo: semPM(horizonte2026?.probSi ?? null),
    umbrales: { verde: '< 20 %', ambar: '20–50 %', rojo: '≥ 50 % (señal de alarma del vídeo)', propuesto: true },
    actualizadoEn: pmOk ? pmFetched : null, stale: pmStale,
    extra: { saltos: saltos(horizonte2026?.serie ?? []), volumen: horizonte2026?.volumen ?? null, fin: horizonte2026?.fin ?? null, sinMercado: !principal },
  }));
  const h2027 = horizontes.find((h) => h.slug === POLYMARKET.slugJunio2027) ?? horizontes[1] ?? null;
  add(base({
    id: 'I05', modulo: 'M2', nombre: `Probabilidad a otro horizonte: ${h2027?.titulo ?? 'sin dato'}`, unidad: '%',
    ayuda: 'El vídeo contrasta el horizonte de 2026 con los de 2027 y 2028. La lista de horizontes es dinámica: todos los mercados abiertos del evento.',
    fuente: { nombre: FUENTES.polymarket.nombre, url: FUENTES.polymarket.url, manual: false, verificado: true }, citaVideo: citaDe(manual, 53),
    valor: h2027?.probSi ?? null, valorTexto: h2027?.probSi != null ? pct(h2027.probSi, 1) : undefined,
    serie: desde(h2027?.serie ?? [], addDays(hoy, -90)),
    semaforo: semPM(h2027?.probSi ?? null),
    umbrales: { verde: '< 20 %', ambar: '20–50 %', rojo: '≥ 50 %', propuesto: true },
    actualizadoEn: pmOk ? pmFetched : null, stale: pmStale,
    extra: { horizontes: horizontes.map((h) => ({ slug: h.slug, titulo: h.titulo, fin: h.fin, probSi: h.probSi, volumen: h.volumen })) },
  }));
  add(base({
    id: 'I06', modulo: 'M2', nombre: 'Reglamento del mercado de Polymarket', unidad: 'texto',
    ayuda: 'Para resolverlo, los sucesos deben estar parametrizados sin ambigüedad. Si cambia el texto del reglamento, se avisa.',
    fuente: { nombre: FUENTES.polymarket.nombre, url: FUENTES.polymarket.url, manual: false, verificado: true }, citaVideo: citaDe(manual, 138),
    valor: reglamento ? 1 : null, valorTexto: reglasCambiadas ? 'Polymarket ha cambiado el reglamento; revisa la lógica' : reglamento ? 'Sin cambios en el reglamento' : undefined,
    semaforo: !reglamento ? 'sin_dato' : reglasCambiadas ? 'ambar' : 'verde',
    actualizadoEn: pmOk ? pmFetched : null, stale: pmStale,
    extra: { descripcion: reglamento, hash: hashReglas, cambiado: reglasCambiadas },
  }));

  // ---------------------------------------------------------------------------
  // M4 — Nvidia
  // ---------------------------------------------------------------------------
  // El trimestre más reciente; si hay varias entradas del mismo trimestre (semilla del vídeo y J2), prevalece la verificada.
  const nv = [...manual.nvidia.items].sort((a, b) =>
    a.trimestre === b.trimestre ? Number(a.verificado) - Number(b.verificado) : a.trimestre.localeCompare(b.trimestre),
  ).pop();
  const trims = revR.ok ? trimestrales(revR.data) : [];
  type Trim = { trimestre: string; end: string; ingresos: number; yoy: number | null; fuente: 'XBRL' | 'manual'; verificado: boolean };
  const lista: Trim[] = trims.map((t) => ({ trimestre: `FY${t.fy}${t.fp}`, end: t.end, ingresos: t.val / 1e6, yoy: null, fuente: 'XBRL', verificado: true }));
  const ultXbrl = lista[lista.length - 1];
  if (nv && nv.ingresos_musd !== null && nv.fecha_dato && (!ultXbrl || nv.fecha_dato > ultXbrl.end)) {
    lista.push({ trimestre: nv.trimestre, end: nv.fecha_dato, ingresos: nv.ingresos_musd, yoy: nv.crec_interanual, fuente: 'manual', verificado: nv.verificado });
  }
  for (let i = 0; i < lista.length; i++) if (lista[i].yoy === null && i >= 4) lista[i].yoy = lista[i].ingresos / lista[i - 4].ingresos - 1;
  const ultT = lista[lista.length - 1] ?? null;
  const discrepanciaManual = (() => {
    if (!nv || !ultT || ultT.fuente !== 'manual' || lista.length < 5 || nv.crec_interanual === null) return null;
    const calc = ultT.ingresos / lista[lista.length - 5].ingresos - 1;
    return Math.abs(calc - nv.crec_interanual) > 0.01 ? calc : null;
  })();
  // 18.7.3: si XBRL ya trae un trimestre que también está en los datos manuales/J2, manda XBRL y se avisa si difieren > 1 %.
  const avisoXbrl = (() => {
    for (const m of manual.nvidia.items) {
      const x = trims.find((t) => `FY${t.fy}${t.fp === 'FY' ? 'Q4' : t.fp}` === m.trimestre);
      if (!x || m.ingresos_musd === null || x.fy === null || x.fp === null) continue;
      const r = preferirXbrl({ valor: x.val / 1e6, fy: x.fy, fp: x.fp }, { valor: m.ingresos_musd, trimestre: m.trimestre });
      if (r.aviso) return r.aviso;
    }
    return null;
  })();
  const semYoy = (y: number | null): Semaforo => (y === null ? 'sin_dato' : y >= UMBRALES.I13.verde ? 'verde' : y >= UMBRALES.I13.ambar ? 'ambar' : 'rojo');
  add(base({
    id: 'I13', modulo: 'M4', nombre: 'Ingresos trimestrales de Nvidia y crecimiento interanual', unidad: 'MUSD',
    ayuda: 'Los resultados son excelentes; el mercado no duda de lo vendido, sino de lo que venderá.',
    fuente: ultT?.fuente === 'manual'
      ? { nombre: `Resultados del 17/11/2026 (${nv?.fuente})`, url: nv?.fuente_url ?? VIDEO.url, manual: true, verificado: nv?.verificado ?? false }
      : { nombre: FUENTES.sec.nombre, url: FUENTES.sec.url, manual: false, verificado: true },
    citaVideo: citaDe(manual, 396),
    valor: ultT?.ingresos ?? null, valorTexto: ultT ? `${musd(ultT.ingresos)} (${pct(ultT.yoy, 0, true)} interanual)` : undefined,
    serie: lista.slice(-8).map((t) => ({ date: t.end, value: t.ingresos })),
    semaforo: semYoy(ultT?.yoy ?? null),
    umbrales: { verde: 'interanual ≥ 30 %', ambar: '0–30 %', rojo: '< 0 %', propuesto: true },
    actualizadoEn: revR.ok ? revR.fetchedAt : null, stale: revR.ok ? !!revR.stale : false,
    notas: [...(ultT?.fuente === 'manual' && !ultT.verificado ? ['Último trimestre: dato del vídeo, sin verificar (aún no está en XBRL).'] : []), ...(discrepanciaManual !== null ? [`El crecimiento calculado con XBRL (${pct(discrepanciaManual, 1)}) difiere del dato manual.`] : [])],
    extra: { trimestres: lista.slice(-8), avisoXbrl },
  }));
  const guid = nv?.guidance_musd ?? null;
  const secuencial = guid !== null && ultT ? guid / ultT.ingresos - 1 : null;
  add(base({
    id: 'I14', modulo: 'M4', nombre: 'Previsión de ingresos del siguiente trimestre', unidad: 'MUSD',
    ayuda: 'La previsión implica un crecimiento secuencial; el mercado duda de que se mantenga.',
    fuente: { nombre: 'Resultados de Nvidia (8-K / CFO commentary)', url: nv?.fuente_url ?? VIDEO.url, manual: true, verificado: nv?.verificado ?? false },
    citaVideo: citaDe(manual, 404),
    valor: guid, valorTexto: guid !== null ? `${musd(guid)} (${pct(secuencial, 1, true)} secuencial)` : undefined,
    semaforo: secuencial === null ? 'sin_dato' : secuencial >= UMBRALES.I14.verde ? 'verde' : secuencial >= UMBRALES.I14.ambar ? 'ambar' : 'rojo',
    umbrales: { verde: 'secuencial ≥ 5 %', ambar: '0–5 %', rojo: '< 0 %', propuesto: true },
    actualizadoEn: iso(nv?.fecha_dato ?? null),
    extra: { secuencial },
  }));
  const garXbrl = garR.ok ? garR.data.map((h) => ({ date: h.end, value: h.val / 1e6 })) : [];
  const garSerie = [...garXbrl];
  if (nv?.garantias_musd && nv.fecha_dato && (!garSerie.length || nv.fecha_dato > garSerie[garSerie.length - 1].date)) garSerie.push({ date: nv.fecha_dato, value: nv.garantias_musd });
  const garUlt = garSerie[garSerie.length - 1] ?? null;
  const garPrev = garSerie[garSerie.length - 2] ?? null;
  const garVar = garUlt && garPrev ? garUlt.value / garPrev.value - 1 : null;
  const garManual = !!garUlt && garUlt.date === nv?.fecha_dato && !garXbrl.some((g) => g.date === garUlt.date);
  const ratioGar = garUlt && ultT ? garUlt.value / (4 * ultT.ingresos) : null;
  add(base({
    id: 'I15', modulo: 'M4', nombre: 'Garantías máximas otorgadas por Nvidia', unidad: 'MUSD',
    ayuda: 'Nvidia no solo vende chips: avala a quien se los compra. Si el cliente deja de pagar, Nvidia responde.',
    fuente: garManual ? { nombre: 'Dato del vídeo (08:12)', url: urlVideo(492), manual: true, verificado: nv?.verificado ?? false } : { nombre: `${FUENTES.sec.nombre} (GuaranteeObligationsMaximumExposure)`, url: FUENTES.sec.url, manual: false, verificado: true },
    citaVideo: citaDe(manual, 492),
    valor: garUlt?.value ?? null, valorTexto: garUlt ? `${musd(garUlt.value)} (${pct(ratioGar, 1)} de los ingresos anualizados)` : undefined,
    serie: garSerie,
    semaforo: ratioGar === null ? 'sin_dato' : ratioGar > UMBRALES.I15.rojo ? 'rojo' : ratioGar >= UMBRALES.I15.verde ? 'ambar' : 'verde',
    umbrales: { verde: 'garantías / ingresos anualizados < 10 %', ambar: '10–25 %', rojo: '> 25 %', propuesto: true },
    actualizadoEn: garR.ok ? garR.fetchedAt : null,
    extra: { ratio: ratioGar, variacionTrimestral: garVar, xbrl: garXbrl },
  }));
  const conc = nv?.garantia_mayor_musd && garUlt ? nv.garantia_mayor_musd / garUlt.value : null;
  add(base({
    id: 'I16', modulo: 'M4', nombre: 'Concentración de garantías en un solo cliente', unidad: '%',
    ayuda: 'Si OpenAI no pagara el alquiler del campus de Ohio, Nvidia asumiría esos pagos.',
    fuente: { nombre: 'Dato del vídeo (08:12)', url: urlVideo(492), manual: true, verificado: nv?.verificado ?? false }, citaVideo: citaDe(manual, 507),
    valor: conc, valorTexto: conc !== null ? `${pct(conc, 0)} (${musd(nv?.garantia_mayor_musd)} de ${musd(garUlt?.value)})` : undefined,
    semaforo: conc === null ? 'sin_dato' : conc > UMBRALES.I16.rojo ? 'rojo' : conc >= UMBRALES.I16.verde ? 'ambar' : 'verde',
    umbrales: { verde: '< 25 %', ambar: '25–50 %', rojo: '> 50 %', propuesto: true },
    actualizadoEn: iso(nv?.fecha_dato ?? null),
    extra: { mayor: nv?.garantia_mayor_musd ?? null, total: garUlt?.value ?? null, descripcion: nv?.descripcion_garantia_mayor ?? null },
  }));
  const hace180 = addDays(hoy, -UMBRALES.gravedadDias);
  const frentesItems = manual.frentes.items;
  const frente = (f: 'direccion' | 'regulacion' | 'financiacion') => {
    const evs = frentesItems.filter((e) => e.frente === f).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const g = Math.max(0, ...evs.filter((e) => e.fecha >= hace180).map((e) => e.gravedad));
    return { semaforo: semGravedad(g), gravedad: g, eventos: evs };
  };
  const frentes = { direccion: frente('direccion'), regulacion: frente('regulacion'), financiacion: frente('financiacion') };
  add(base({
    id: 'I17', modulo: 'M4', nombre: 'Registro de los tres frentes de Nvidia', unidad: 'texto',
    ayuda: 'Dirección, regulación y financiación a clientes: los tres frentes abiertos que cita el vídeo.',
    fuente: { nombre: 'Registro de eventos (data/manual/frentes_nvidia.json)', url: urlVideo(425), manual: true, verificado: frentesItems.every((e) => e.verificado) },
    citaVideo: citaDe(manual, 425),
    valor: Math.max(frentes.direccion.gravedad, frentes.regulacion.gravedad, frentes.financiacion.gravedad),
    valorTexto: `Dirección ${frentes.direccion.gravedad}/3 · Regulación ${frentes.regulacion.gravedad}/3 · Financiación ${frentes.financiacion.gravedad}/3`,
    semaforo: peor(frentes.direccion.semaforo, frentes.regulacion.semaforo, frentes.financiacion.semaforo),
    umbrales: { verde: 'sin eventos en 180 días', ambar: 'gravedad 1-2', rojo: 'gravedad 3', propuesto: true },
    actualizadoEn: iso(frentesItems.map((e) => e.fecha).sort().pop() ?? null),
    extra: { frentes },
  }));
  add(base({
    id: 'I18', modulo: 'M4', nombre: 'Acuerdos circulares con neoclouds', unidad: 'bool',
    ayuda: 'Nvidia vende infraestructura a neoclouds y se compromete a comprarles servicios de nube: «Nvidia ha actuado como un banco».',
    fuente: { nombre: 'Dato del vídeo; listado de 10-Q en SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=10-Q', manual: true, verificado: nv?.verificado ?? false },
    citaVideo: citaDe(manual, 517),
    valor: nv?.acuerdos_circulares_declarados === undefined ? null : nv.acuerdos_circulares_declarados ? 1 : 0,
    valorTexto: nv?.acuerdos_circulares_declarados ? 'Sí, declarados' : nv?.acuerdos_circulares_declarados === false ? 'No' : undefined,
    semaforo: nv?.acuerdos_circulares_declarados === undefined ? 'sin_dato' : nv.acuerdos_circulares_declarados ? 'ambar' : 'verde',
    umbrales: { verde: 'no declarados', ambar: 'declarados', rojo: '—', propuesto: true },
    actualizadoEn: iso(nv?.fecha_dato ?? null), notas: nv?.nota_acuerdos ? [nv.nota_acuerdos] : [],
  }));

  // ---------------------------------------------------------------------------
  // M5 — Semiconductores
  // ---------------------------------------------------------------------------
  const soxx = serieY(SIMBOLOS.soxx);
  const soxxInfo = infoDrawdown(soxx, 0.4);
  const brecha = nvdaInfo && soxxInfo ? (nvdaInfo.dd - soxxInfo.dd) * 100 : null;
  const normA = (s: Array<{ date: string; close: number }>, f: string) => {
    const b = valorEn(aPuntos(s), f);
    return b ? desde(aPuntos(s), addDays(f, -365)).map((p) => ({ date: p.date, value: (p.value / b.value) * 100 })) : [];
  };
  add(base({
    id: 'I19', modulo: 'M5', nombre: 'SOXX frente a NVDA: ¿una empresa o todo el sector?', unidad: 'pp',
    ayuda: 'Si la brecha es menor de 10 puntos, la caída es sectorial; si NVDA cae mucho más, es específica de Nvidia.',
    fuente: fuenteYahoo('SOXX'), citaVideo: citaDe(manual, 612),
    valor: brecha, valorTexto: brecha !== null ? `${pp(brecha, 1)} (${Math.abs(brecha) < 10 ? 'caída sectorial' : brecha < 0 ? 'caída específica de Nvidia' : 'Nvidia aguanta mejor que el sector'})` : undefined,
    series: soxxInfo ? { SOXX: normA(soxx, soxxInfo.athFecha), NVDA: normA(nvda, soxxInfo.athFecha) } : undefined,
    semaforo: brecha === null ? 'sin_dato' : Math.abs(brecha) < 10 ? 'ambar' : 'verde',
    umbrales: { verde: '|brecha| ≥ 10 pp (caída concentrada)', ambar: '|brecha| < 10 pp (caída sectorial)', rojo: '—', propuesto: true },
    actualizadoEn: fechaY('SOXX'), stale: staleY('SOXX'),
    extra: { ddNvda: nvdaInfo?.dd, ddSoxx: soxxInfo?.dd, soxxClose: soxxInfo?.close, soxxD1: variacion(soxx, 1), soxxD5: variacion(soxx, 5), soxxAthFecha: soxxInfo?.athFecha },
  }));
  const sox = serieY(SIMBOLOS.sox);
  const r42 = peorRacha(sox);
  const r42Soxx = variacion(soxx, 42);
  const coincideVideo = r42.anteriorFecha ? mesAnio(r42.anteriorFecha) === 'septiembre de 2001' : false;
  add(base({
    id: 'I20', modulo: 'M5', nombre: 'Peor racha de 42 sesiones desde 1994 (^SOX)', unidad: '%',
    ayuda: 'El vídeo dice que un desplome así solo se superó en septiembre de 2001.',
    fuente: fuenteYahoo('^SOX'), citaVideo: citaDe(manual, 657),
    valor: r42.actual, valorTexto: r42.actual !== null ? `${pct(r42.actual)} · ${r42.texto}${r42.anteriorFecha && !coincideVideo ? ' (el vídeo dice septiembre de 2001)' : ''}` : undefined,
    serie: compactar(r42.serie, 3),
    semaforo: semaforoBajada(r42.actual, UMBRALES.I20.ambar, UMBRALES.I20.rojo),
    umbrales: { verde: '> −15 %', ambar: '−15 % a −30 %', rojo: '≤ −30 %', propuesto: true },
    actualizadoEn: fechaY('^SOX'), stale: staleY('^SOX'),
    extra: { texto: r42.texto, anteriorFecha: r42.anteriorFecha, anteriorValor: r42.anteriorValor, r42Soxx, coincideVideo },
  }));
  const glob = serieY(SIMBOLOS.etfGlobal).length ? SIMBOLOS.etfGlobal : SIMBOLOS.etfGlobalRespaldo;
  const globS = serieY(glob);
  const globInfo = infoDrawdown(globS, 0.4);
  add(base({
    id: 'I21', modulo: 'M5', nombre: 'ETF global de semiconductores (referencia)', unidad: '%',
    ayuda: 'Unas 260 empresas de semiconductores de todo el mundo; caída similar a la del SOXX.',
    fuente: fuenteYahoo(glob), citaVideo: citaDe(manual, 680),
    valor: globInfo?.dd ?? null, valorTexto: globInfo ? `${pct(globInfo.dd)} desde máximos (SOXX: ${pct(soxxInfo?.dd)})` : undefined,
    series: soxxInfo && globInfo ? { Global: normA(globS, globInfo.athFecha), SOXX: normA(soxx, globInfo.athFecha) } : undefined,
    semaforo: semaforoBajada(globInfo?.dd ?? null, -0.2, -0.4),
    umbrales: { verde: '> −20 %', ambar: '−20 % a −40 %', rojo: '≤ −40 %', propuesto: true },
    actualizadoEn: fechaY(glob), stale: staleY(glob),
    extra: { simbolo: glob, isin: 'IE000I8KRLL9' },
  }));
  const comps = manual.componentes.items.map((c) => {
    const info = infoDrawdown(serieY(c.ticker), 0.5);
    return { ...c, dd: info?.dd ?? null, ath: info?.ath ?? null, close: info?.close ?? null, athFecha: info?.athFecha ?? null };
  });
  add(base({
    id: 'I22', modulo: 'M5', nombre: 'Composición destacada del SOXX', unidad: 'texto',
    ayuda: 'Peso máximo por empresa en torno al 8 % (según el vídeo). No se hace scraping de pesos.',
    fuente: { nombre: 'Lista estática (data/seed/soxx_componentes.json) y Yahoo Finance', url: urlVideo(568), manual: true, verificado: true }, citaVideo: citaDe(manual, 568),
    valor: comps.filter((c) => c.dd !== null).length, valorTexto: `${comps.length} empresas citadas`,
    semaforo: 'verde', actualizadoEn: fechaY('AMD'),
    extra: { componentes: comps },
  }));

  // ---------------------------------------------------------------------------
  // M6 — Proveedores
  // ---------------------------------------------------------------------------
  add(base({
    id: 'I23', modulo: 'M6', nombre: 'Tabla de proveedores (condición 3 desglosada)', unidad: '%',
    ayuda: textosAyuda.c3, fuente: fuenteYahoo('AVGO'), citaVideo: citaDe(manual, 818),
    valor: masCercano?.dd ?? null, valorTexto: masCercano ? `Más cercano: ${masCercano.nombre} (${pct(masCercano.dd)}; umbral ${usd(masCercano.umbral)})` : undefined,
    semaforo: c3.semaforo, proximidad: c3Prox, actualizadoEn: c3.actualizadoEn, stale: c3Stale,
    notas: c3.notas, extra: { filas: detalle, destacada: masCercano?.ticker ?? null },
  }));

  // ---------------------------------------------------------------------------
  // M7 — Economía real del cómputo
  // ---------------------------------------------------------------------------
  const semI24 = (() => {
    if (!oficialReciente) return 'sin_dato' as Semaforo;
    if (c4.estado === 'cumplida') return 'rojo' as Semaforo;
    const p = h100Ult!.value;
    if (p <= UMBRALES.I24.ambarPrecio || (d90 !== null && d90 <= UMBRALES.I24.ambarTendencia)) return 'ambar' as Semaforo;
    if (p > UMBRALES.I24.ambarPrecio && (d90 === null || d90 > UMBRALES.I24.verdeTendencia)) return 'verde' as Semaforo;
    return 'ambar' as Semaforo;
  })();
  const puntosVideo = manual.gpu.filter((g) => g.gpu === 'h100' && !g.verificado);
  add(base({
    id: 'I24', modulo: 'M7', nombre: 'Alquiler de la H100 (Silicon Data SDH100RT)', unidad: 'USD/h',
    ayuda: 'Si se hubiera construido más capacidad de la necesaria, veríamos chips ociosos y alquileres a la baja. Hoy el alquiler sube.',
    fuente: c4.fuente, citaVideo: citaDe(manual, 926),
    valor: oficialReciente ? h100Ult!.value : null,
    valorTexto: oficialReciente ? `${num(h100Ult!.value, 2)} $/h · ${pct(d30, 1, true)} en 30 días` : undefined,
    serie: h100, series: { umbral: h100.map((p) => ({ date: p.date, value: 1 })) },
    semaforo: semI24,
    umbrales: { verde: '> 1,5 $/h y Δ90d > −10 %', ambar: '≤ 1,5 $/h o Δ90d ≤ −25 %', rojo: '5 días seguidos ≤ 1,00 $/h (Polymarket)', propuesto: true },
    actualizadoEn: c4.actualizadoEn, stale: frH100.stale,
    notas: [
      ...(puntosVideo.length ? ['La serie incluye cifras del vídeo, sin verificar (2,88 $ hace un mes, con fecha aproximada).'] : []),
      ...(h100Ult && !h100Verif ? [`El último valor es un dato del vídeo, sin verificar.`] : []),
      'Diciembre de 2025: cifra inaudible en el vídeo (coherente con unos 2 $); no se muestra.',
    ],
    extra: { d30, d90, dDic, racha, oficial: usaApi ? 'api' : 'manual', puntosVideo },
  }));
  const iaaHs = manual.gpuAbierto.filter((r) => r.gpu.toLowerCase().startsWith('h100') && r.lectura === 'hs').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const frIaa = frescura(iaaUlt?.fecha ?? null, hoy, 2, 5);
  add(base({
    id: 'I24b', modulo: 'M7', nombre: 'Índice abierto de alquiler de la H100 (proxy, no oficial)', unidad: 'USD/h',
    ayuda: 'Proxy abierto (no oficial): mediana de RunPod y Vast.ai; aparte, la media de Azure y AWS. Es otra metodología y no cuenta para Polymarket.',
    fuente: { nombre: FUENTES.gpuAbierto.nombre, url: FUENTES.silicondata.url, manual: false, verificado: true },
    valor: iaaUlt && !frIaa.sinDato ? iaaUlt.valor : null,
    valorTexto: iaaUlt ? `${num(iaaUlt.valor, 2)} $/h (neoclouds) · ${num(iaaHs[iaaHs.length - 1]?.valor ?? null, 2)} $/h (hiperescaladores)` : undefined,
    serie: iaa.map((r) => ({ date: r.fecha, value: r.valor })), series: { hiperescaladores: iaaHs.map((r) => ({ date: r.fecha, value: r.valor })) },
    semaforo: iaaUlt && !frIaa.sinDato ? (iaaUlt.valor <= 1 ? 'rojo' : iaaUlt.valor <= 1.5 ? 'ambar' : 'verde') : 'sin_dato',
    umbrales: { verde: '> 1,5 $/h', ambar: '≤ 1,5 $/h', rojo: '≤ 1,00 $/h', propuesto: true },
    actualizadoEn: iso(iaaUlt?.fecha ?? null), stale: frIaa.stale,
    extra: { detalle: iaaUlt ? iaaUlt.detalle_json : null, fuentes: iaaUlt?.fuentes_usadas ?? null },
  }));
  const b200Manual = manual.gpu.filter((g) => g.gpu === 'b200' && g.usd_hora !== null).sort((a, b) => a.fecha.localeCompare(b.fecha)).pop();
  const b200Api = sdB200.ok ? sdB200.data[sdB200.data.length - 1] : null;
  const b200 = b200Api?.value ?? b200Manual?.usd_hora ?? null;
  const anomaliaDelta = d12m ?? dDic;
  const anomalia = anomaliaDelta !== null && b200 !== null && h100Ult ? anomaliaDelta > 0 && b200 > h100Ult.value : null;
  add(base({
    id: 'I25', modulo: 'M7', nombre: 'Anomalía de depreciación de la H100', unidad: 'bool',
    ayuda: 'Lo normal sería que la H100 se abaratara al llegar chips nuevos, como un ordenador cuando sale otro modelo.',
    fuente: c4.fuente, citaVideo: citaDe(manual, 953),
    valor: anomalia === null ? null : anomalia ? 1 : 0,
    valorTexto: anomalia === null ? undefined : anomalia ? 'Anomalía presente: la demanda supera a la capacidad' : 'Sin anomalía: la H100 se abarata con normalidad',
    semaforo: anomalia === null ? 'sin_dato' : anomalia ? 'verde' : 'ambar',
    umbrales: { verde: 'la H100 sube con generaciones más caras en el mercado', ambar: 'la H100 se abarata', rojo: '—', propuesto: true },
    actualizadoEn: c4.actualizadoEn,
    notas: anomalia === null ? ['Hace falta un dato de hace 12 meses (o de diciembre de 2025) para calcularlo; el del vídeo es inaudible.'] : [],
    extra: { d12m, dDic, b200 },
  }));
  const iaaB200 = manual.gpuAbierto.filter((r) => r.gpu.toLowerCase().startsWith('b200') && r.lectura === 'neo').pop();
  const barras = [
    { gpu: 'H100', usd: h100Ult?.value ?? null, fuente: usaApi ? 'Silicon Data' : 'Silicon Data (manual)', verificado: h100Verif },
    { gpu: 'B200', usd: b200, fuente: b200Api ? 'Silicon Data' : 'Vídeo (≈10 $/h)', verificado: !!b200Api || !!b200Manual?.verificado },
    ...(iaaB200 ? [{ gpu: 'B200 (proxy abierto)', usd: iaaB200.valor, fuente: 'Índice abierto', verificado: true }] : []),
  ];
  add(base({
    id: 'I26', modulo: 'M7', nombre: 'Precio por hora de la B200 y otras GPU', unidad: 'USD/h',
    ayuda: 'La B200 (Blackwell) cuesta casi 10 $/h según el vídeo.',
    fuente: b200Api ? { nombre: FUENTES.silicondata.nombre, url: FUENTES.silicondata.url, manual: false, verificado: true } : fuenteVideo(975),
    citaVideo: citaDe(manual, 975),
    valor: b200, valorTexto: b200 !== null ? `${num(b200, 2)} $/h` : undefined,
    semaforo: b200 === null ? 'sin_dato' : 'verde',
    actualizadoEn: iso(b200Api?.date ?? b200Manual?.fecha ?? null),
    extra: { barras },
  }));

  // ---------------------------------------------------------------------------
  // M8 — Laboratorios
  // ---------------------------------------------------------------------------
  const labs = manual.laboratorios.items;
  add(base({
    id: 'I27', modulo: 'M8', nombre: 'Estado de OpenAI y Anthropic', unidad: 'texto',
    ayuda: 'Quiebra de OpenAI o Anthropic: «nada verosímil» antes de fin de año, según el vídeo.',
    fuente: { nombre: 'Datos manuales (data/manual/laboratorios.json)', url: urlVideo(1049), manual: true, verificado: labs.every((l) => l.verificado) },
    citaVideo: citaDe(manual, 1007),
    valor: Math.max(...labs.map((l) => normLab(l.estado) ?? 0)),
    valorTexto: labs.map((l) => `${l.lab}: ${l.estado === 'normal' ? 'normal' : l.estado === 'tension' ? 'tensión' : 'evento'}`).join(' · '),
    semaforo: peor(...labs.map((l): Semaforo => (l.estado === 'evento' ? 'rojo' : l.estado === 'tension' ? 'ambar' : 'verde'))),
    actualizadoEn: iso(labs.map((l) => l.fecha).sort().pop() ?? null),
    extra: { labs },
  }));
  const ant = serieY(SIMBOLOS.anthropic);
  const antUlt = ant[ant.length - 1] ?? null;
  const antInfo = infoDrawdown(ant, 0.5);
  add(base({
    id: 'I28', modulo: 'M8', nombre: 'Cotización de Anthropic (ANT, Nasdaq)', unidad: 'USD',
    ayuda: 'Anthropic acaba de salir a bolsa a 83 $ por acción.', fuente: fuenteYahoo('ANT'), citaVideo: citaDe(manual, 1035),
    valor: antUlt?.close ?? null, valorTexto: antUlt ? `${usd(antUlt.close)} (${pct(antUlt.close / UMBRALES.I28.opv - 1, 1, true)} frente a la OPV)` : undefined,
    serie: aPuntos(ant),
    semaforo: !antUlt ? 'sin_dato' : antUlt.close >= UMBRALES.I28.opv ? 'verde' : antUlt.close >= UMBRALES.I28.rojo ? 'ambar' : 'rojo',
    umbrales: { verde: '≥ 83 $ (precio de la OPV)', ambar: '58,1–83 $', rojo: '< 58,1 $ (−30 %)', propuesto: true },
    actualizadoEn: fechaY('ANT'), stale: staleY('ANT'),
    notas: ['Precio de la OPV (83 $): dato del vídeo, sin verificar.'],
    extra: { opv: UMBRALES.I28.opv, dd: antInfo?.dd ?? null, sesiones: ant.length },
  }));
  const fin = manual.financiacion.items;
  const ipo = serieY(SIMBOLOS.ipo);
  const ipoD60 = variacionDias(aPuntos(ipo), 60, ipo[ipo.length - 1]?.date);
  const semI32 = semaforoBajada(ipoD60, -0.000001, UMBRALES.I32.rojo);
  const rondas180 = fin.filter((f) => f.fecha >= addDays(hoy, -UMBRALES.rondasDias));
  const porAnio: Record<string, Record<string, number>> = {};
  for (const f of fin) {
    if (f.importe_musd === null) continue;
    const a = f.fecha.slice(0, 4);
    porAnio[a] = porAnio[a] ?? {};
    porAnio[a][f.lab] = (porAnio[a][f.lab] ?? 0) + f.importe_musd;
  }
  const semI29: Semaforo = rondas180.length === 0 && semI32 === 'rojo' ? 'rojo' : rondas180.length === 0 ? 'ambar' : 'verde';
  add(base({
    id: 'I29', modulo: 'M8', nombre: 'Financiación captada por los laboratorios', unidad: 'MUSD',
    ayuda: 'Los laboratorios pierden dinero y dependen de la financiación para comprar cómputo.',
    fuente: { nombre: 'Datos manuales (data/manual/financiacion_labs.json)', url: urlVideo(1035), manual: true, verificado: fin.every((f) => f.verificado) },
    citaVideo: citaDe(manual, 1042),
    valor: fin.reduce((s, f) => s + (f.importe_musd ?? 0), 0) || null,
    valorTexto: fin.map((f) => `${f.lab}: ${f.importe_musd !== null ? musd(f.importe_musd) : 'cifra no disponible'}`).join(' · '),
    semaforo: semI29,
    umbrales: { verde: 'hay rondas en los últimos 180 días', ambar: 'sin rondas en 180 días', rojo: 'sin rondas y ventana de OPV en rojo', propuesto: true },
    actualizadoEn: iso(fin.map((f) => f.fecha).sort().pop() ?? null),
    notas: fin.filter((f) => f.importe_musd === null).map((f) => `${f.lab}: ${f.nota}`),
    extra: { items: fin, porAnio },
  }));

  // ---------------------------------------------------------------------------
  // M9 — Condiciones financieras y políticas
  // ---------------------------------------------------------------------------
  let bono = dgs10.ok ? dgs10.data : [];
  let bonoFuente = { nombre: `${FUENTES.fred.nombre}: DGS10`, url: `${FUENTES.fred.url}DGS10`, manual: false, verificado: true };
  if (!bono.length) {
    bono = aPuntos(serieY(SIMBOLOS.tnx));
    bonoFuente = fuenteYahoo('^TNX');
  }
  bono = bono.filter((p) => p.date <= hoy);
  const bonoUlt = bono[bono.length - 1] ?? null;
  const frBono = frescura(bonoUlt?.date ?? null, hoy, 3, 7);
  const bonoV = bonoUlt && !frBono.sinDato ? bonoUlt.value : null;
  add(base({
    id: 'I30', modulo: 'M9', nombre: 'Bono del Tesoro de EE. UU. a 10 años', unidad: '%',
    ayuda: 'Un tipo de interés más alto rebaja el valor presente de la inversión futura en IA.', fuente: bonoFuente, citaVideo: citaDe(manual, 1145),
    valor: bonoV, valorTexto: bonoV !== null ? `${num(bonoV, 2)} %` : undefined,
    serie: desde(bono, addDays(hoy, -365 * 2)),
    semaforo: bonoV === null ? 'sin_dato' : bonoV >= UMBRALES.I30.rojo ? 'rojo' : bonoV >= UMBRALES.I30.ambar ? 'ambar' : 'verde',
    umbrales: { verde: '< 4,25 %', ambar: '4,25–4,75 %', rojo: '≥ 4,75 %', propuesto: true },
    actualizadoEn: dgs10.ok ? dgs10.fetchedAt : fechaY('^TNX'), stale: frBono.stale || (dgs10.ok && !!dgs10.stale),
    extra: { fecha: bonoUlt?.date ?? null },
  }));
  const fu = fedU.ok ? fedU.data.filter((p) => p.date <= hoy) : [];
  const fl = fedL.ok ? fedL.data.filter((p) => p.date <= hoy) : [];
  const fuUlt = fu[fu.length - 1] ?? null;
  const fu180 = valorEn(fu, addDays(hoy, -180));
  const fedD = fuUlt && fu180 ? Math.round((fuUlt.value - fu180.value) * 100) / 100 : null;
  add(base({
    id: 'I31', modulo: 'M9', nombre: 'Tipo objetivo de la Reserva Federal y tendencia', unidad: '%',
    ayuda: '«La Reserva Federal está subiendo los tipos» (19:03).',
    fuente: { nombre: `${FUENTES.fred.nombre}: DFEDTARU y DFEDTARL`, url: `${FUENTES.fred.url}DFEDTARU`, manual: false, verificado: true },
    citaVideo: citaDe(manual, 1143),
    valor: fuUlt?.value ?? null, valorTexto: fuUlt ? `${num(fl[fl.length - 1]?.value ?? null, 2)}–${num(fuUlt.value, 2)} % (${fedD === null ? 'sin dato' : `${fedD > 0 ? '+' : ''}${num(fedD, 2)} pp en 180 días`})` : undefined,
    serie: desde(fu, addDays(hoy, -365 * 2)),
    semaforo: fedD === null ? 'sin_dato' : fedD < 0 ? 'verde' : fedD === 0 ? 'ambar' : 'rojo',
    umbrales: { verde: 'bajadas en 180 días', ambar: 'sin cambios', rojo: 'subidas', propuesto: true },
    actualizadoEn: fedU.ok ? fedU.fetchedAt : null,
    extra: { delta180: fedD, inferior: fl[fl.length - 1]?.value ?? null },
  }));
  add(base({
    id: 'I32', modulo: 'M9', nombre: 'Ventana de salidas a bolsa (proxy: ETF IPO)', unidad: '%',
    ayuda: 'Proxy de la ventana de OPV: cartera de empresas recién salidas a bolsa. Si cae, la ventana se estrecha.',
    fuente: fuenteYahoo('IPO'), citaVideo: citaDe(manual, 1154),
    valor: ipoD60, valorTexto: ipoD60 !== null ? `${pct(ipoD60, 1, true)} en 60 días · ${usd(ipo[ipo.length - 1]?.close)}` : undefined,
    serie: aPuntos(desde(ipo, addDays(hoy, -365))),
    semaforo: semI32,
    umbrales: { verde: 'Δ60d > 0 %', ambar: '0 a −15 %', rojo: '≤ −15 %', propuesto: true },
    actualizadoEn: fechaY('IPO'), stale: staleY('IPO'),
    extra: { opv: manual.opv.items, d5: variacion(ipo, 5) },
  }));
  const evFin = frentes.financiacion.eventos.filter((e) => e.fecha >= hace180);
  const gFin = Math.max(0, ...evFin.map((e) => e.gravedad));
  const semI33: Semaforo = (garVar !== null && garVar < -0.1) || gFin >= 3 ? 'rojo' : gFin > 0 ? 'ambar' : 'verde';
  add(base({
    id: 'I33', modulo: 'M9', nombre: 'Repliegue de Nvidia como financiadora', unidad: 'texto',
    ayuda: 'Si Nvidia deja de financiar y avalar a sus clientes, parte de ellos se quedan sin financiación y compran menos.',
    fuente: { nombre: 'Combinación de I15 (garantías) e I17 (frente financiación)', url: urlVideo(542), manual: true, verificado: frentesItems.filter((e) => e.frente === 'financiacion').every((e) => e.verificado) },
    citaVideo: citaDe(manual, 1150),
    valor: normSemaforo(semI33), valorTexto: semI33 === 'rojo' ? 'Repliegue en marcha' : semI33 === 'ambar' ? 'Anuncio de reevaluación de la financiación' : 'Sin señales de repliegue',
    semaforo: semI33,
    umbrales: { verde: 'sin eventos', ambar: 'evento de financiación de gravedad ≤ 2', rojo: 'garantías −10 % en el trimestre o gravedad 3', propuesto: true },
    actualizadoEn: iso(evFin[0]?.fecha ?? null),
    extra: { variacionGarantias: garVar, eventos: evFin },
  }));
  const reg = manual.regulacion.items;
  const gReg = Math.max(0, ...reg.filter((r) => r.fecha >= hace180).map((r) => r.gravedad));
  add(base({
    id: 'I34', modulo: 'M9', nombre: 'Riesgo regulatorio y político sobre los centros de datos', unidad: 'indice',
    ayuda: 'La regulación puede frenar la construcción de centros de datos; una escasez futura de chips revalorizaría el cómputo actual.',
    fuente: { nombre: 'Datos manuales (data/manual/regulacion.json)', url: urlVideo(1157), manual: true, verificado: reg.every((r) => r.verificado) },
    citaVideo: citaDe(manual, 1157),
    valor: gReg, valorTexto: `Gravedad máxima a 180 días: ${gReg}/3`,
    semaforo: semGravedad(gReg),
    umbrales: { verde: 'sin eventos', ambar: 'gravedad 1-2', rojo: 'gravedad 3', propuesto: true },
    actualizadoEn: iso(reg.map((r) => r.fecha).sort().pop() ?? null),
    extra: { items: reg },
  }));

  // ---------------------------------------------------------------------------
  // IRP, divergencia y escenario
  // ---------------------------------------------------------------------------
  const irp = calcularIRP(
    {
      c1: c1.proximidad ?? null,
      c2: c2.proximidad ?? null,
      c3: c3.proximidad ?? null,
      c4: c4.proximidad ?? null,
      c5: c5.proximidad ?? null,
      c6: c6.proximidad ?? null,
      I30: normBono(indicadores.I30.valor),
      I31: normFed(fedD),
      I32: normOpv(ipoD60),
      I33: normSemaforo(semI33),
      I34: normGravedad(gReg),
    },
    ventana.pinchazo,
  );
  const div = divergencia(irp.F, irp.R);
  add(base({
    id: 'I35', modulo: 'M10', nombre: 'Divergencia financiero-real', unidad: 'indice',
    ayuda: 'D = F − R. Si es alta, se hunde la bolsa pero no la economía real de quienes alquilan los chips.',
    fuente: { nombre: 'Cálculo del panel (sección 6)', url: '#metodologia', manual: false, verificado: true }, citaVideo: citaDe(manual, 1090),
    valor: div.D, valorTexto: div.D !== null ? `${num(div.D, 1)} · ${div.lectura}` : undefined,
    semaforo: div.D === null ? 'sin_dato' : div.D >= ESCENARIOS.divergencia.financiero ? 'ambar' : div.D <= ESCENARIOS.divergencia.real ? 'rojo' : 'ambar',
    umbrales: { verde: '—', ambar: 'D ≥ 40: pinchazo financiero sin reflejo real; −20 < D < 40: ajuste mixto', rojo: 'D ≤ −20: deterioro real', propuesto: true },
    actualizadoEn: new Date().toISOString(),
    extra: { lectura: div.lectura, F: irp.F, R: irp.R },
  }));
  const ev: Partial<Record<string, string>> = {
    ventana: `${ventana.n}/6 condiciones en la ventana de 90 días`,
    F: irp.F !== null ? `Subíndice financiero F = ${num(irp.F, 1)} (c1 ${num(c1.proximidad ?? null, 0)}, c2 ${num(c2.proximidad ?? null, 0)}, c3 ${num(c3.proximidad ?? null, 0)})` : undefined,
    R: irp.R !== null ? `Subíndice real R = ${num(irp.R, 1)} (c4 ${num(c4.proximidad ?? null, 0)}, c5 ${num(c5.proximidad ?? null, 0)}, c6 ${num(c6.proximidad ?? null, 0)})` : undefined,
    c4: oficialReciente ? `H100 a ${num(h100Ult!.value, 2)} $/h (Δ90d ${pct(d90, 1, true)})` : undefined,
    c4d30: d30 !== null ? `Alquiler de la H100: ${pct(d30, 1, true)} en 30 días` : undefined,
    labs: `Laboratorios: ${labs.map((l) => `${l.lab} ${l.estado}`).join(', ')}`,
    c1: c1.fechaSuceso ? `c1 cumplida el ${fFecha(c1.fechaSuceso)}` : undefined,
    c2: c2.fechaSuceso ? `c2 cumplida el ${fFecha(c2.fechaSuceso)}` : undefined,
    c3: c3.fechaSuceso ? `c3 cumplida el ${fFecha(c3.fechaSuceso)}` : undefined,
    c5: c5.fechaSuceso ? `c5: ${c5.valorTexto}` : undefined,
    c6: c6.fechaSuceso ? `c6: ${c6.valorTexto}` : undefined,
  };
  const escenario = diagnosticar({
    nVentana: ventana.n,
    F: irp.F,
    R: irp.R,
    c4Semaforo: oficialReciente ? semI24 : null,
    c4Delta90: d90,
    c4Delta30: d30,
    labs: [c5.extra?.estado as Lab, c6.extra?.estado as Lab],
    evidencias: ev,
  });
  add(base({
    id: 'I36', modulo: 'M10', nombre: 'Diagnóstico de escenario', unidad: 'texto',
    ayuda: 'Reglas deterministas evaluadas en orden (sección 5, I36).',
    fuente: { nombre: 'Cálculo del panel', url: '#escenarios', manual: false, verificado: true }, citaVideo: citaDe(manual, 1384),
    valor: null, valorTexto: escenario.titulo,
    semaforo: escenario.codigo === 'PINCHAZO_PM' ? 'rojo' : escenario.codigo === 'E2' ? 'naranja' : escenario.codigo === 'SIN' ? 'verde' : 'ambar',
    actualizadoEn: new Date().toISOString(),
    extra: { codigo: escenario.codigo, evidencias: escenario.evidencias },
  }));
  const semFin = peor(indicadores.I30.semaforo, indicadores.I31.semaforo, indicadores.I32.semaforo);
  const semVentas = peor(indicadores.I13.semaforo, indicadores.I14.semaforo);
  add(base({
    id: 'I37', modulo: 'M10', nombre: 'Mecanismo de retroalimentación financiero → real', unidad: 'texto',
    ayuda: 'Lo financiero no solo puede anticipar el pinchazo real: puede provocarlo.',
    fuente: { nombre: 'Estado vivo de I30-I32, I29, I24 e I13-I14', url: '#escenarios', manual: false, verificado: true }, citaVideo: citaDe(manual, 1376),
    valor: null, valorTexto: 'Financiación cara o cerrada → los laboratorios compran menos cómputo → baja la demanda → baja el precio del alquiler → caen las ventas de chips',
    semaforo: peor(semFin, indicadores.I29.semaforo, semI24, semVentas),
    actualizadoEn: new Date().toISOString(),
    extra: { nodos: { financiacion: semFin, laboratorios: indicadores.I29.semaforo, demanda: indicadores.I29.semaforo, alquiler: semI24, ventas: semVentas } },
  }));

  // ---------------------------------------------------------------------------
  // M11 — Puntocom
  // ---------------------------------------------------------------------------
  const max2000 = (() => {
    const tramo = ixic.filter((p) => p.date >= '1999-01-01' && p.date <= '2001-12-31');
    if (!tramo.length) return null;
    return tramo.reduce((m, p) => (p.close > m.close ? p : m));
  })();
  const puntosPc: Array<{ x: number; y2000: number | null; yActual: number | null }> = [];
  if (max2000 && ixicInfo) {
    const i0 = ixic.findIndex((p) => p.date === max2000.date);
    const i1 = ixic.findIndex((p) => p.date === ixicInfo.athFecha);
    for (let x = -250; x <= 750; x += 5) {
      const a = ixic[i0 + x];
      const b = i1 + x < ixic.length && i1 + x >= 0 ? ixic[i1 + x] : undefined;
      puntosPc.push({ x, y2000: a ? Math.round((a.close / max2000.close) * 1000) / 10 : null, yActual: b ? Math.round((b.close / ixicInfo.ath) * 1000) / 10 : null });
    }
  }
  const sesionesDesdeMax = ixicInfo ? ixic.length - 1 - ixic.findIndex((p) => p.date === ixicInfo.athFecha) : null;
  add(base({
    id: 'I38', modulo: 'M11', nombre: 'Nasdaq 2000 frente a Nasdaq actual', unidad: 'indice',
    ayuda: 'El Nasdaq empezó a hundirse en marzo de 2000; el precio de la fibra se desplomó después.', fuente: fuenteYahoo('^IXIC'), citaVideo: citaDe(manual, 1268),
    valor: ixicInfo ? (ixicInfo.close / ixicInfo.ath) * 100 : null,
    valorTexto: max2000 && ixicInfo ? `Máximo de 2000: ${fFecha(max2000.date)}; hoy, ${sesionesDesdeMax} sesiones después del máximo actual (${num((ixicInfo.close / ixicInfo.ath) * 100, 1)} sobre 100)` : undefined,
    semaforo: semaforoBajada(ixicInfo?.dd ?? null, -0.1, -0.2), actualizadoEn: fechaY('^IXIC'), stale: staleY('^IXIC'),
    extra: { puntos: puntosPc, max2000: max2000?.date ?? null, maxActual: ixicInfo?.athFecha ?? null, sesionesDesdeMax },
  }));
  add(base({
    id: 'I39', modulo: 'M11', nombre: 'Fibra: precio frente a demanda (2000-2002)', unidad: 'USD',
    ayuda: manual.puntocom.texto, fuente: fuenteVideo(1279), citaVideo: citaDe(manual, 1279),
    valor: manual.puntocom.fibra[manual.puntocom.fibra.length - 1].usd_anio, valorTexto: manual.puntocom.fibra.map((f) => `${f.anio}: ${num(f.usd_anio, 0)} $${f.dudoso ? ' (dudoso)' : ''}`).join(' · '),
    semaforo: 'rojo', actualizadoEn: null,
    notas: manual.puntocom.fibra.filter((f) => f.dudoso).map((f) => `${f.anio}: ${f.nota}`),
    extra: { fibra: manual.puntocom.fibra, demanda: manual.puntocom.demanda },
  }));
  const caida12 = h100Ult && pRef ? h100Ult.value / pRef - 1 : null;
  add(base({
    id: 'I40', modulo: 'M11', nombre: 'Análogo actual: ¿cae el «precio de la fibra» de hoy?', unidad: '%',
    ayuda: 'El alquiler de la H100 es el equivalente actual del precio de la fibra en 2000-2002.', fuente: c4.fuente, citaVideo: citaDe(manual, 1303),
    valor: caida12, valorTexto: caida12 === null ? undefined : caida12 <= UMBRALES.I40.caida12m ? 'Patrón puntocom en marcha' : 'Sin patrón puntocom en el precio del cómputo',
    semaforo: caida12 === null ? 'sin_dato' : caida12 <= UMBRALES.I40.caida12m ? 'rojo' : 'verde',
    umbrales: { verde: 'caída < 50 % desde el máximo de 12 meses', ambar: '—', rojo: 'caída > 50 % en 12 meses', propuesto: true },
    actualizadoEn: c4.actualizadoEn, notas: ['Se mide como la caída del último valor frente al máximo de los últimos 12 meses.'],
  }));

  // ---------------------------------------------------------------------------
  // M0 — Cabecera
  // ---------------------------------------------------------------------------
  add(base({
    id: 'I42', modulo: 'M0', nombre: 'Valor evaporado de Nvidia desde máximos', unidad: 'USD',
    ayuda: '«Casi 3 billones de dólares evaporados solo en Nvidia desde máximos» (23:57).',
    fuente: indicadores.I03.fuente, citaVideo: citaDe(manual, 1437),
    valor: capATH, valorTexto: usdGrande(capATH), semaforo: capATH === null ? 'sin_dato' : 'rojo', actualizadoEn: fechaY('NVDA'), stale: staleY('NVDA'),
    extra: { acciones },
  }));
  const frase = fraseDelDia({
    n: ventana.n,
    probPolymarket: principal?.probSi ?? null,
    distNvda: c1.distanciaRestante ?? null,
    h100: c4.valor,
    h100Delta30: d30,
    diagnostico: escenario.titulo,
  });
  add(base({
    id: 'I41', modulo: 'M0', nombre: 'Frase del día', unidad: 'texto', ayuda: 'Plantilla determinista, sin LLM.',
    fuente: { nombre: 'Cálculo del panel', url: '#resumen', manual: false, verificado: true }, valorTexto: frase, semaforo: irp.semaforo, actualizadoEn: new Date().toISOString(),
  }));

  // ---------------------------------------------------------------------------
  // Salud de los conectores
  // ---------------------------------------------------------------------------
  const yOk = Array.from(Y.values());
  const salud: SaludConector[] = [
    { conector: 'yahoo', ok: yOk.filter((r) => r.ok).length >= Math.ceil(yOk.length / 2), error: yOk.filter((r) => !r.ok).map((r) => (r.ok ? '' : r.error)).filter(Boolean)[0], fetchedAt: fechaY('NVDA') ?? new Date().toISOString(), stale: yOk.some((r) => r.ok && r.stale) },
    { conector: 'fred', ok: dgs10.ok && fedU.ok, error: !dgs10.ok ? dgs10.error : !fedU.ok ? fedU.error : undefined, fetchedAt: dgs10.fetchedAt, stale: dgs10.ok && !!dgs10.stale },
    { conector: 'polymarket', ok: pmOk && eventos.length > 0, error: pmError, fetchedAt: pmFetched, stale: pmStale },
    { conector: 'sec', ok: revR.ok && garR.ok && accR.ok, error: [revR, garR, accR].map((r) => (r.ok ? '' : r.error)).filter(Boolean)[0], fetchedAt: revR.fetchedAt, stale: revR.ok && !!revR.stale },
    { conector: 'silicondata', ok: sdH100.ok, error: sdH100.ok ? undefined : sdH100.error === 'sin_clave' ? 'sin_clave: se usa el CSV manual' : sdH100.error, fetchedAt: sdH100.fetchedAt, stale: sdH100.ok && !!sdH100.stale },
    { conector: 'gpuAbierto', ok: !!iaaUlt, error: iaaUlt ? undefined : 'sin datos en data/auto/gpu_alquiler_abierto.csv', fetchedAt: iso(iaaUlt?.fecha ?? null) ?? new Date().toISOString(), stale: frIaa.stale },
    { conector: 'manual', ok: true, fetchedAt: new Date().toISOString(), stale: false },
  ];

  return {
    generadoEn: new Date().toISOString(),
    hoy,
    condiciones,
    ventana,
    indicadores,
    irp: { ...irp, valor: irp.valor === null ? null : Math.round(irp.valor * 10) / 10 },
    escenario,
    polymarket: { horizontes, principal: principal?.slug ?? null, reglasCambiadas, reglamento, resueltos },
    fraseDelDia: frase,
    salud,
  };
}

export const _internos = { frescura, clamp, drawdown };

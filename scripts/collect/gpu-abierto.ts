// J1 · Recolector del índice abierto de alquiler de GPU (IAA), secciones 18.2 y 18.4.
// Uso: pnpm tsx scripts/collect/gpu-abierto.ts [--hoy=YYYY-MM-DD] [--salida=DIR] [--raiz=DIR]
// Escribe data/auto/gpu_alquiler_abierto.csv (reemplaza las filas del día) y data/auto/sucesos.csv,
// y deja en --salida pr-body.md, labels.txt y hay-cambios.txt para el workflow.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pedirJson } from '../lib/http';
import { escribirFichero, escribirJson, escribirSalidaPR, leerArgs, leerCsv, serializarCsv, type FilaCsv, SALIDA_POR_DEFECTO } from '../lib/ficheros';

export type Gpu = 'H100' | 'B200';
export const GPUS: Gpu[] = ['H100', 'B200'];
export const CABECERA_IAA = ['fecha', 'gpu', 'lectura', 'valor', 'fuentes_usadas', 'detalle_json'];
export const CABECERA_SUCESOS = ['fecha', 'condicion', 'detalle'];
export const RANGO_IAA = { min: 0.3, max: 40, variacionMax: 0.25 };
export const VAST_MIN_OFERTAS = 3;

/** Correspondencias por GPU en cada fuente (sección 18.2). */
export const MAPA = {
  runpod: { H100: 'H100 SXM', B200: 'B200' } as Record<Gpu, string>,
  vast: { H100: 'H100 SXM', B200: 'B200' } as Record<Gpu, string>,
  // Solo SKU verificados el 21/11/2026; Azure no tiene aún un SKU B200 verificado (se deja fuera).
  azure: { H100: { sku: 'Standard_ND96isr_H100_v5', gpus: 8 } } as Partial<Record<Gpu, { sku: string; gpus: number }>>,
  aws: {
    H100: { tipo: 'p5.48xlarge', gpus: 8 },
    B200: { tipo: 'p6-b200.48xlarge', gpus: 8 },
  } as Partial<Record<Gpu, { tipo: string; gpus: number }>>,
};

export const URLS = {
  runpod: 'https://api.runpod.io/graphql',
  vast: (gpuName: string) =>
    `https://cloud.vast.ai/api/v0/bundles/?q=${encodeURIComponent(
      JSON.stringify({ gpu_name: { eq: gpuName }, rentable: { eq: true }, type: 'on-demand', limit: 500 }),
    )}`,
  azure: (sku: string) =>
    `https://prices.azure.com/api/retail/prices?$filter=${encodeURIComponent(
      `armSkuName eq '${sku}' and priceType eq 'Consumption' and armRegionName eq 'eastus'`,
    )}`,
  aws: 'https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/ec2-ondemand-without-sec-sel/US%20East%20(N.%20Virginia)/Linux/index.json',
};

// ---------- Parsers (funciones puras) ----------

export interface PreciosRunpod {
  community: number | null;
  secure: number | null;
}

export function parsearRunpod(json: unknown, gpu: Gpu): PreciosRunpod {
  const tipos = (json as { data?: { gpuTypes?: Array<Record<string, unknown>> } })?.data?.gpuTypes ?? [];
  const t = tipos.find((g) => g.displayName === MAPA.runpod[gpu]);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return { community: num(t?.communityPrice), secure: num(t?.securePrice) };
}

export function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function parsearVast(json: unknown): { ofertas: number; mediana: number | null } {
  const ofertas = (json as { offers?: Array<Record<string, unknown>> })?.offers ?? [];
  const precios = ofertas
    .map((o) => (typeof o.dph_total === 'number' && typeof o.num_gpus === 'number' && o.num_gpus > 0 ? o.dph_total / o.num_gpus : NaN))
    .filter((p) => Number.isFinite(p) && p > 0);
  return { ofertas: precios.length, mediana: mediana(precios) };
}

/** Precio por GPU·h de Azure (Linux, a demanda; se excluyen Spot y Low Priority). */
export function parsearAzure(json: unknown, gpus: number): number | null {
  const items = (json as { Items?: Array<Record<string, unknown>> })?.Items ?? [];
  const validos = items.filter(
    (i) =>
      (i.type === undefined || i.type === 'Consumption') &&
      typeof i.retailPrice === 'number' &&
      i.retailPrice > 0 &&
      !/spot|low priority/i.test(String(i.skuName ?? '') + String(i.meterName ?? '')) &&
      !/windows/i.test(String(i.productName ?? '')),
  );
  if (validos.length === 0) return null;
  return Math.min(...validos.map((i) => i.retailPrice as number)) / gpus;
}

/** Busca en el JSON de precios de AWS el objeto con "Instance Type" = tipo y devuelve price / gpus. */
export function parsearAws(json: unknown, tipo: string, gpus: number): number | null {
  let encontrado: number | null = null;
  const visitar = (o: unknown, profundidad: number) => {
    if (encontrado !== null || profundidad > 6 || !o || typeof o !== 'object') return;
    const r = o as Record<string, unknown>;
    if (r['Instance Type'] === tipo && r.price !== undefined) {
      const p = Number(r.price);
      if (Number.isFinite(p) && p > 0) encontrado = p / gpus;
      return;
    }
    for (const v of Object.values(r)) visitar(v, profundidad + 1);
  };
  visitar(json, 0);
  return encontrado;
}

// ---------- Cálculo del IAA (sección 18.2) ----------

export interface EntradaIAA {
  runpod?: PreciosRunpod | null;
  vast?: { ofertas: number; mediana: number | null } | null;
  azure?: number | null;
  aws?: number | null;
}

export interface LecturaIAA {
  valor: number | null;
  fuentes: string[];
  detalle: Record<string, unknown>;
}

/**
 * IAA_neo = mediana(RunPod community, RunPod secure, mediana Vast on-demand).
 * Se excluyen los precios 0 (RunPod sin stock) y Vast con < 3 ofertas. Con < 2 fuentes (proveedores) → sin dato.
 */
export function calcularIAAneo(e: EntradaIAA): LecturaIAA {
  const valores: number[] = [];
  const fuentes: string[] = [];
  const excluidas: string[] = [];
  const detalle: Record<string, unknown> = {};
  const rp = e.runpod;
  let runpodUsada = false;
  for (const k of ['community', 'secure'] as const) {
    const v = rp?.[k] ?? null;
    detalle[`runpod_${k}`] = v;
    if (v !== null && v > 0) {
      valores.push(v);
      runpodUsada = true;
    } else if (rp) excluidas.push(`runpod_${k}${v === 0 ? ' (precio 0)' : ' (sin dato)'}`);
  }
  if (runpodUsada) fuentes.push('runpod');
  if (e.vast) {
    detalle.vast_mediana = e.vast.mediana;
    detalle.vast_ofertas = e.vast.ofertas;
    if (e.vast.mediana !== null && e.vast.ofertas >= VAST_MIN_OFERTAS) {
      valores.push(e.vast.mediana);
      fuentes.push('vast');
    } else excluidas.push(`vast (${e.vast.ofertas} ofertas)`);
  }
  if (excluidas.length) detalle.excluidas = excluidas;
  if (fuentes.length < 2) return { valor: null, fuentes, detalle: { ...detalle, motivo: 'menos de 2 fuentes' } };
  return { valor: redondear(mediana(valores)!), fuentes, detalle };
}

/** IAA_hs = media de Azure y AWS por GPU. Exige las dos lecturas. */
export function calcularIAAhs(e: EntradaIAA): LecturaIAA {
  const detalle: Record<string, unknown> = { azure: e.azure ?? null, aws: e.aws ?? null };
  const pares = [
    ['azure', e.azure],
    ['aws', e.aws],
  ].filter((p): p is [string, number] => typeof p[1] === 'number' && p[1] > 0);
  const fuentes = pares.map((p) => p[0]);
  if (pares.length < 2) return { valor: null, fuentes, detalle: { ...detalle, motivo: 'menos de 2 fuentes' } };
  return { valor: redondear(pares.reduce((s, p) => s + p[1], 0) / pares.length), fuentes, detalle };
}

export const redondear = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

export interface FilaIAA {
  fecha: string;
  gpu: Gpu;
  lectura: 'neo' | 'hs';
  valor: number;
  fuentes_usadas: string;
  detalle_json: string;
}

export function filasDelDia(fecha: string, porGpu: Partial<Record<Gpu, EntradaIAA>>): { filas: FilaIAA[]; omitidas: string[] } {
  const filas: FilaIAA[] = [];
  const omitidas: string[] = [];
  for (const gpu of GPUS) {
    const e = porGpu[gpu];
    if (!e) continue;
    for (const [lectura, l] of [
      ['neo', calcularIAAneo(e)],
      ['hs', calcularIAAhs(e)],
    ] as const) {
      if (l.valor === null) {
        omitidas.push(`${gpu} ${lectura}: ${String(l.detalle.motivo ?? 'sin dato')}`);
        continue;
      }
      filas.push({ fecha, gpu, lectura, valor: l.valor, fuentes_usadas: l.fuentes.join('+'), detalle_json: JSON.stringify(l.detalle) });
    }
  }
  return { filas, omitidas };
}

/** Sustituye las filas del día por las nuevas y ordena por fecha, gpu y lectura. */
export function reemplazarDia(existentes: FilaCsv[], fecha: string, nuevas: FilaIAA[]): FilaCsv[] {
  const resto = existentes.filter((f) => f.fecha !== fecha);
  const nuevasCsv = nuevas.map((n) => ({ ...n, valor: String(n.valor) }) as unknown as FilaCsv);
  return [...resto, ...nuevasCsv].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.gpu.localeCompare(b.gpu) || a.lectura.localeCompare(b.lectura),
  );
}

/** Clasificación del PR de J1: automerge solo si todo está en rango, con variación ≤ 25 % y sin tocar días anteriores. */
export function clasificarJ1(antes: FilaCsv[], despues: FilaCsv[], fecha: string): { etiqueta: 'automerge' | 'revision-humana'; motivos: string[] } {
  const motivos: string[] = [];
  const clave = (f: FilaCsv) => `${f.fecha}|${f.gpu}|${f.lectura}|${f.valor}`;
  const antesOtros = antes.filter((f) => f.fecha !== fecha).map(clave).sort().join('\n');
  const despuesOtros = despues.filter((f) => f.fecha !== fecha).map(clave).sort().join('\n');
  if (antesOtros !== despuesOtros) motivos.push('se modifican filas de días anteriores');
  for (const f of despues.filter((x) => x.fecha === fecha)) {
    const v = Number(f.valor);
    if (!(v >= RANGO_IAA.min && v <= RANGO_IAA.max)) motivos.push(`${f.gpu} ${f.lectura} = ${f.valor} fuera de rango (${RANGO_IAA.min}–${RANGO_IAA.max} $/h)`);
    const previa = antes
      .filter((x) => x.fecha < fecha && x.gpu === f.gpu && x.lectura === f.lectura)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .pop();
    if (previa) {
      const delta = v / Number(previa.valor) - 1;
      if (Math.abs(delta) > RANGO_IAA.variacionMax)
        motivos.push(`${f.gpu} ${f.lectura}: variación ${(delta * 100).toFixed(1)} % frente al ${previa.fecha}`);
    }
  }
  return { etiqueta: motivos.length ? 'revision-humana' : 'automerge', motivos };
}

// ---------- Sucesos (18.7.2) ----------

export function anadirSucesos(existentes: FilaCsv[], sucesos: Array<{ cond: string; fecha: string }>, detalle: string): { filas: FilaCsv[]; nuevos: FilaCsv[] } {
  const hay = new Set(existentes.map((f) => `${f.fecha}|${f.condicion}`));
  const nuevos: FilaCsv[] = [];
  for (const s of sucesos) {
    const k = `${s.fecha}|${s.cond}`;
    if (hay.has(k)) continue;
    hay.add(k);
    nuevos.push({ fecha: s.fecha, condicion: s.cond, detalle });
  }
  const filas = [...existentes, ...nuevos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.condicion.localeCompare(b.condicion));
  return { filas, nuevos };
}

// ---------- Descarga ----------

export async function descargarEntradas(): Promise<{ porGpu: Record<Gpu, EntradaIAA>; errores: string[] }> {
  const errores: string[] = [];
  const porGpu: Record<Gpu, EntradaIAA> = { H100: {}, B200: {} };
  const rp = await pedirJson(URLS.runpod, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'query { gpuTypes { id displayName securePrice communityPrice } }' }),
  });
  if (!rp.ok) errores.push(`runpod: ${rp.error}`);
  const aws = await pedirJson(URLS.aws, { timeoutMs: 30_000 });
  if (!aws.ok) errores.push(`aws: ${aws.error}`);
  for (const gpu of GPUS) {
    if (rp.ok) porGpu[gpu].runpod = parsearRunpod(rp.data, gpu);
    const v = await pedirJson(URLS.vast(MAPA.vast[gpu]));
    if (v.ok) porGpu[gpu].vast = parsearVast(v.data);
    else errores.push(`vast ${gpu}: ${v.error}`);
    const az = MAPA.azure[gpu];
    if (az) {
      const r = await pedirJson(URLS.azure(az.sku));
      if (r.ok) porGpu[gpu].azure = parsearAzure(r.data, az.gpus);
      else errores.push(`azure ${gpu}: ${r.error}`);
    }
    const aw = MAPA.aws[gpu];
    if (aw && aws.ok) porGpu[gpu].aws = parsearAws(aws.data, aw.tipo, aw.gpus);
  }
  return { porGpu, errores };
}

export interface ResultadoJ1 {
  filas: FilaIAA[];
  omitidas: string[];
  errores: string[];
  etiqueta: 'automerge' | 'revision-humana';
  motivos: string[];
  hayCambios: boolean;
  sucesosNuevos: FilaCsv[];
}

export async function ejecutarJ1(o: {
  raiz: string;
  hoy: string;
  salida: string;
  entradas?: { porGpu: Partial<Record<Gpu, EntradaIAA>>; errores: string[] };
  sucesos?: Array<{ cond: string; fecha: string }>;
}): Promise<ResultadoJ1> {
  const rutaIaa = join(o.raiz, 'data/auto/gpu_alquiler_abierto.csv');
  const rutaSucesos = join(o.raiz, 'data/auto/sucesos.csv');
  const { porGpu, errores } = o.entradas ?? (await descargarEntradas());
  const { filas, omitidas } = filasDelDia(o.hoy, porGpu);
  const csv = leerCsv(rutaIaa, CABECERA_IAA);
  let hayCambios = false;
  let clas: { etiqueta: 'automerge' | 'revision-humana'; motivos: string[] } = { etiqueta: 'automerge', motivos: [] };
  if (filas.length) {
    const nuevas = reemplazarDia(csv.filas, o.hoy, filas);
    const texto = serializarCsv(CABECERA_IAA, nuevas);
    hayCambios = texto !== serializarCsv(CABECERA_IAA, csv.filas);
    clas = clasificarJ1(csv.filas, nuevas, o.hoy);
    if (hayCambios) escribirFichero(rutaIaa, texto);
  }
  let sucesosNuevos: FilaCsv[] = [];
  if (o.sucesos?.length) {
    const s = leerCsv(rutaSucesos, CABECERA_SUCESOS);
    const r = anadirSucesos(s.filas, o.sucesos, 'Cruce detectado por J1 en /api/snapshot');
    sucesosNuevos = r.nuevos;
    if (r.nuevos.length) {
      hayCambios = true;
      escribirFichero(rutaSucesos, serializarCsv(CABECERA_SUCESOS, r.filas));
      if (r.nuevos.some((n) => n.condicion === 'c5' || n.condicion === 'c6')) {
        clas = { etiqueta: 'revision-humana', motivos: [...clas.motivos, 'suceso de c5/c6'] };
      }
    }
  }
  const log = { fecha: o.hoy, filas, omitidas, errores, etiqueta: clas.etiqueta, motivos: clas.motivos, sucesosNuevos };
  escribirJson(join(o.salida, 'collect-log.json'), log);
  const cuerpo = [
    `## J1 · Índice abierto de alquiler de GPU (${o.hoy})`,
    '',
    '| GPU | Lectura | $/GPU·h | Fuentes | Detalle |',
    '|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.gpu} | ${f.lectura} | ${f.valor} | ${f.fuentes_usadas} | \`${f.detalle_json}\` |`),
    '',
    omitidas.length ? `**Sin dato (no se escribe fila):** ${omitidas.join('; ')}` : '',
    errores.length ? `**Fuentes con error:** ${errores.join('; ')}` : '',
    sucesosNuevos.length ? `**Sucesos nuevos:** ${sucesosNuevos.map((s) => `${s.condicion} ${s.fecha}`).join(', ')}` : '',
    '',
    `**Clasificación:** \`${clas.etiqueta}\`${clas.motivos.length ? ` — ${clas.motivos.join('; ')}` : ''}`,
    '',
    'Generado por `scripts/collect/gpu-abierto.ts`. El auto-merge nativo solo actúa si CI pasa y la etiqueta es `automerge`.',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
  escribirSalidaPR(o.salida, { cuerpo, etiquetas: [clas.etiqueta], hayCambios, titulo: `J1: índice abierto de GPU ${o.hoy}` });
  return { filas, omitidas, errores, etiqueta: clas.etiqueta, motivos: clas.motivos, hayCambios, sucesosNuevos };
}

async function principal() {
  const a = leerArgs();
  const hoy = a.hoy || new Date().toISOString().slice(0, 10);
  let sucesos: Array<{ cond: string; fecha: string }> | undefined;
  const site = process.env.SITE_URL;
  if (site) {
    const s = await pedirJson<{ ventana?: { sucesos?: Array<{ cond: string; fecha: string }> } }>(`${site.replace(/\/$/, '')}/api/snapshot`);
    if (s.ok) sucesos = s.data.ventana?.sucesos ?? [];
    else console.log(`[collect] no se pudo leer /api/snapshot: ${s.error}`);
  }
  const r = await ejecutarJ1({ raiz: a.raiz || process.cwd(), hoy, salida: a.salida || SALIDA_POR_DEFECTO, sucesos });
  console.log(`[collect] filas=${r.filas.length} omitidas=${r.omitidas.length} errores=${r.errores.join('; ') || 'ninguno'} etiqueta=${r.etiqueta}`);
  if (r.filas.length === 0) console.log('[collect] menos de 2 fuentes para todas las lecturas: no se escribe fila');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    console.error('[collect] error', e);
    process.exit(1);
  });
}

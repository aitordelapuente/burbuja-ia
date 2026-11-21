import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CONDICIONES } from '@/lib/config';
import { fecha, pct, usd } from '@/lib/calc/formato';
import { obtenerSnapshot } from '@/components/cargarSnapshot';
import { Tarjeta, TituloTarjeta } from '@/components/Tarjeta';
import { Semaforo } from '@/components/Semaforo';
import { BarraProximidad } from '@/components/BarraProximidad';
import { GraficoSerie, type SerieGrafico } from '@/components/GraficoSerie';
import { TablaProveedores } from '@/components/TablaProveedores';
import { RegistroEventos, aEventos } from '@/components/RegistroEventos';
import { CitaVideo } from '@/components/CitaVideo';
import { InsigniaFuente } from '@/components/InsigniaFuente';
import { AvisoStale } from '@/components/AvisoStale';
import { SinDato } from '@/components/SinDato';
import { BotonImprimir } from '@/components/BotonImprimir';
import { LimiteError } from '@/components/LimiteError';
import { NotasIndicador } from '@/components/TarjetaIndicador';
import { textoEstadoCondicion, textoUmbral } from '@/components/TarjetaCondicion';
import { REGLAMENTO_ES } from '@/components/reglamento';
import { AYUDA_CONDICIONES, COLOR_BLOQUE, IDS_CONDICIONES, META_ESTADO, TITULO_CONDICION, aligerar, exArr, textoValor, ultimos } from '@/components/utilidades';

export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const t = TITULO_CONDICION[id];
  return t ? { title: `Condición ${id.slice(1)}: ${t}` } : {};
}

/** Busca en el reglamento original la frase de esta condición: «(n) …;». */
function reglaOriginal(texto: string | null, id: string): string | null {
  if (!texto) return null;
  const n = id.slice(1);
  const m = new RegExp(`\\(${n}\\)\\s*([^;]+?)(?:;|\\.\\s|\\s\\(${Number(n) + 1}\\)|$)`).exec(texto);
  return m ? m[1].trim() : null;
}

export default async function PaginaCondicion({ params }: Props) {
  if (process.env.MOCK_DATA === '1') await connection();
  const { id } = await params;
  if (!(IDS_CONDICIONES as readonly string[]).includes(id)) notFound();
  const s = await obtenerSnapshot();
  const c = s.condiciones.find((x) => x.id === id);
  if (!c) notFound();

  const meta = META_ESTADO[c.estado] ?? META_ESTADO.sin_dato;
  const { corto, detalle } = textoEstadoCondicion(c);
  const bloque = COLOR_BLOQUE[c.bloque] ?? COLOR_BLOQUE.financiero;
  const esC4 = c.id === 'c4';
  const serieCompleta = c.series?.completa?.length ? c.series.completa : c.serie;
  const series: SerieGrafico[] = [];
  if (serieCompleta?.length) series.push({ id: 'v', nombre: c.nombre, puntos: aligerar(serieCompleta, 1500, 400), color: bloque.color });
  if (!esC4 && c.series?.umbral?.length) series.push({ id: 'u', nombre: 'Precio umbral', puntos: c.series.umbral, color: 'var(--rojo)', escalonada: true, discontinua: true });
  if (esC4 && c.series?.proxy?.length) series.push({ id: 'px', nombre: 'Proxy abierto (no oficial)', puntos: c.series.proxy, color: 'var(--azul)', discontinua: true });
  const cierres = ultimos(c.serie, 30).slice().reverse();
  const umbralPorFecha = new Map((c.series?.umbral ?? []).map((p) => [p.date, p.value]));
  const original = reglaOriginal(s.polymarket.reglamento, c.id);
  const eventos = exArr(c.extra, 'eventos');
  const ayuda = c.ayuda || AYUDA_CONDICIONES[c.id];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <nav aria-label="Migas" className="no-imprimir mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/#condiciones" className="enlace">
          ← Volver a las 6 condiciones
        </Link>
        <BotonImprimir />
      </nav>
      <LimiteError nombre={`Condición ${c.id.slice(1)}`}>
        <header className="mb-4">
          <p className={`text-xs font-semibold uppercase tracking-wide ${bloque.texto}`}>
            Condición {c.id.slice(1)} · Bloque {bloque.nombre.toLowerCase()}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{TITULO_CONDICION[c.id] ?? c.nombre}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Semaforo valor={meta.semaforo} texto={corto} etiqueta="Estado de la condición" tamano="lg" />
            {detalle ? <span className="text-sm font-medium text-rojo-tx">{detalle}</span> : null}
            <span className="cifra text-2xl font-semibold">{textoValor(c) ?? ''}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Tarjeta className="md:col-span-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-texto-2">Umbral</dt>
                <dd className="cifra">{textoUmbral(c)}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-2">Distancia restante</dt>
                <dd className="cifra">{c.cumplidaHoy ? 'umbral superado' : c.distanciaRestante !== null && c.distanciaRestante !== undefined ? pct(c.distanciaRestante) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-2">Fecha del suceso</dt>
                <dd className="cifra">{c.fechaSuceso ? fecha(c.fechaSuceso) : 'sin suceso'}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-2">Sucesos en el horizonte</dt>
                <dd className="cifra">{c.sucesos?.length ? c.sucesos.map(fecha).join(', ') : 'ninguno'}</dd>
              </div>
            </dl>
            <BarraProximidad className="mt-3" valor={c.proximidad} semaforo={c.estado === 'sin_dato' ? 'sin_dato' : meta.semaforo} />
            {c.heredada ? <p className="mt-2 text-sm text-texto-2">Cumplida desde {fecha(c.cumplidaDesde ?? null)}; Polymarket y el vídeo no la cuentan como suceso nuevo.</p> : null}
            {c.enInvestigacion ? <p className="mt-2 text-sm text-ambar-tx">Posible suceso en investigación (no cuenta hasta cumplir la regla A o B).</p> : null}
            {c.stale ? <AvisoStale className="mt-2" actualizadoEn={c.actualizadoEn} /> : null}
            <NotasIndicador className="mt-2" notas={c.notas} />
          </Tarjeta>

          <Tarjeta className="md:col-span-3">
            <TituloTarjeta nivel={2}>Evolución y umbral</TituloTarjeta>
            <div className="mt-2">
              {series.length ? (
                <GraficoSerie
                  titulo={`${c.nombre}: serie y umbral`}
                  series={series}
                  referencias={esC4 ? [{ y: CONDICIONES.c4PrecioMax, etiqueta: 'Umbral: 1 $/h' }] : c.precioUmbral ? [{ y: c.precioUmbral, etiqueta: `Umbral actual: ${usd(c.precioUmbral)}` }] : []}
                  banda={esC4 ? { y1: 0, y2: CONDICIONES.c4PrecioMax, etiqueta: '≤ 1 $/h' } : undefined}
                  formato={esC4 ? 'usdh' : 'usd'}
                  rangoInicial={esC4 ? 'Máx' : '1A'}
                  grande
                />
              ) : c.id === 'c5' || c.id === 'c6' ? (
                <RegistroEventos eventos={aEventos(eventos)} vacio="Sin eventos verificados ni en investigación. Esta condición no tiene serie de precios: se activa solo con un evento verificado (regla A o B)." />
              ) : (
                <SinDato />
              )}
            </div>
          </Tarjeta>

          {c.id === 'c3' ? (
            <Tarjeta className="md:col-span-3">
              <TituloTarjeta nivel={2}>Desglose por proveedor</TituloTarjeta>
              <TablaProveedores className="mt-2" detalle={c.detalle} />
            </Tarjeta>
          ) : null}

          {cierres.length ? (
            <Tarjeta className="md:col-span-2">
              <TituloTarjeta nivel={2}>{esC4 ? 'Últimos valores publicados' : 'Últimos 30 cierres'}</TituloTarjeta>
              <div className="mt-2 max-h-[28rem] overflow-auto" tabIndex={0} role="region" aria-label="Tabla desplazable">
                <table className="tabla">
                  <caption className="sr-only">{esC4 ? 'Últimos valores publicados' : 'Últimos 30 cierres'} de {c.nombre}</caption>
                  <thead className="sticky top-0 bg-superficie">
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col" className="num">{esC4 ? 'Precio ($/h)' : 'Cierre'}</th>
                      <th scope="col" className="num">Umbral</th>
                      <th scope="col">¿Cumplida?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierres.map((p) => {
                      const u = esC4 ? CONDICIONES.c4PrecioMax : umbralPorFecha.get(p.date);
                      return (
                        <tr key={p.date}>
                          <th scope="row" className="cifra font-normal">
                            {fecha(p.date)}
                          </th>
                          <td className="num">{usd(p.value)}</td>
                          <td className="num">{u === undefined ? '—' : usd(u)}</td>
                          <td>{u === undefined ? '—' : p.value <= u ? 'Sí' : 'No'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          ) : null}

          <div className={`${cierres.length ? 'md:col-span-1' : 'md:col-span-3'} flex flex-col gap-4`}>
            <Tarjeta className="flex flex-col gap-2">
              <TituloTarjeta nivel={2}>Por qué importa</TituloTarjeta>
              <p className="text-sm">{ayuda}</p>
              {c.citaVideo ? <CitaVideo texto={c.citaVideo.texto} t={c.citaVideo.t} /> : null}
              <InsigniaFuente fuente={c.fuente} actualizadoEn={c.actualizadoEn} />
            </Tarjeta>
          </div>

          <Tarjeta className="flex flex-col gap-3 md:col-span-3">
            <TituloTarjeta nivel={2}>Regla de Polymarket</TituloTarjeta>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-2">Original (inglés)</p>
                {original ? (
                  <blockquote lang="en" className="mt-1 border-l-2 border-borde-fuerte pl-3 text-sm">
                    {original}
                  </blockquote>
                ) : null}
                {s.polymarket.reglamento ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-texto-2">Reglamento completo</summary>
                    <p lang="en" className="mt-1 whitespace-pre-line text-xs text-texto-2">
                      {s.polymarket.reglamento}
                    </p>
                  </details>
                ) : (
                  <SinDato className="mt-1" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-2">Traducción</p>
                <blockquote className="mt-1 border-l-2 border-borde-fuerte pl-3 text-sm">{REGLAMENTO_ES.condiciones[c.id]}</blockquote>
                <p className="mt-2 text-xs text-texto-2">{REGLAMENTO_ES.intro}</p>
                <p className="mt-1 text-[11px] text-texto-2">{REGLAMENTO_ES.nota}</p>
              </div>
            </div>
          </Tarjeta>
        </div>
        <nav aria-label="Otras condiciones" className="no-imprimir mt-6 flex flex-wrap gap-2 text-sm">
          {IDS_CONDICIONES.filter((x) => x !== c.id).map((x) => (
            <Link key={x} href={`/condicion/${x}`} className="rounded-md border border-borde px-2 py-1 hover:border-borde-fuerte">
              {x.toUpperCase()} · {TITULO_CONDICION[x]}
            </Link>
          ))}
        </nav>
      </LimiteError>
    </main>
  );
}

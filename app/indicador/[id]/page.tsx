import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { Indicador } from '@/lib/types';
import { fecha } from '@/lib/calc/formato';
import { obtenerSnapshot } from '@/components/cargarSnapshot';
import { Tarjeta, TituloTarjeta } from '@/components/Tarjeta';
import { Semaforo } from '@/components/Semaforo';
import { GraficoSerie, type SerieGrafico } from '@/components/GraficoSerie';
import { CitaVideo } from '@/components/CitaVideo';
import { InsigniaFuente } from '@/components/InsigniaFuente';
import { AvisoStale } from '@/components/AvisoStale';
import { BarraProximidad } from '@/components/BarraProximidad';
import { BotonImprimir } from '@/components/BotonImprimir';
import { LimiteError } from '@/components/LimiteError';
import { NotasIndicador, Umbrales, ValorIndicador } from '@/components/TarjetaIndicador';
import { ANCLAS, aligerar, esRegistro, formatear, tipoPorUnidad, type TipoFormato } from '@/components/utilidades';

export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

const COLORES = ['var(--azul)', 'var(--violeta)', 'var(--ambar)', 'var(--verde)', 'var(--gris-tx)'];

/** Formato de los gráficos por indicador (cuando la unidad no basta). */
const FORMATO: Record<string, TipoFormato> = {
  I01: 'num', I03: 'usd', I04: 'prob', I05: 'prob', I13: 'musd', I15: 'musd', I19: 'num', I20: 'pct', I21: 'num',
  I24: 'usdh', I24b: 'usdh', I28: 'usd', I30: 'tasa', I31: 'tasa', I32: 'usd', I38: 'num',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const s = await obtenerSnapshot();
    const i = s.indicadores[id];
    return i ? { title: `${i.id} · ${i.nombre}` } : {};
  } catch {
    return {};
  }
}

const ETIQUETAS: Record<string, string> = {
  fecha: 'Fecha', titulo: 'Título', detalle: 'Detalle', gravedad: 'Gravedad', verificado: 'Verificado', fuente: 'Fuente', fuente_url: 'Fuente',
  lab: 'Laboratorio', estado: 'Estado', nota: 'Nota', importe_musd: 'Importe (M$)', tipo: 'Tipo', ticker: 'Ticker', nombre: 'Nombre',
  papel: 'Papel', dd: 'Caída', ath: 'Máximo', close: 'Cierre', trimestre: 'Trimestre', ingresos: 'Ingresos (M$)', yoy: 'Interanual',
  gpu: 'GPU', usd: '$/h', ambito: 'Ámbito', efecto: 'Efecto', frente: 'Frente', origen: 'Origen', anio: 'Año', usd_anio: '$/año',
  dudoso: 'Dudoso', factor: 'Factor', acumulado: 'Acumulado', end: 'Fin del periodo', empresa: 'Empresa', precio_opv: 'Precio OPV',
};

function celda(k: string, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') {
    if (k === 'dd' || k === 'yoy') return formatear(v, 'pct');
    if (k === 'importe_musd' || k === 'ingresos') return formatear(v, 'musd');
    return formatear(v, Number.isInteger(v) ? 'entero' : 'num2');
  }
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fecha(v) : v;
  return JSON.stringify(v);
}

/** Tablas genéricas para los arrays de objetos planos de `extra`. */
function TablasExtra({ extra }: { extra: Indicador['extra'] }) {
  if (!esRegistro(extra)) return null;
  const tablas = Object.entries(extra).filter(([, v]) => Array.isArray(v) && v.length > 0 && v.every(esRegistro) && v.length <= 400) as Array<[string, Record<string, unknown>[]]>;
  if (tablas.length === 0) return null;
  return (
    <>
      {tablas.map(([k, filas]) => {
        const cols = Array.from(new Set(filas.flatMap((f) => Object.keys(f)))).filter((c) => !['t', 'caduca_en', 'modelo', 'cita'].includes(c)).slice(0, 8);
        return (
          <Tarjeta key={k}>
            <TituloTarjeta nivel={2}>Datos: {k}</TituloTarjeta>
            <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable">
            <table className="tabla">
              <caption className="sr-only">Datos «{k}» del indicador</caption>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c} scope="col">
                      {ETIQUETAS[c] ?? c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 200).map((f, i) => (
                  <tr key={i}>
                    {cols.map((c) =>
                      c === 'fuente_url' && typeof f[c] === 'string' ? (
                        <td key={c}>
                          <a href={f[c] as string} target="_blank" rel="noopener noreferrer" className="enlace">
                            enlace
                          </a>
                        </td>
                      ) : (
                        <td key={c}>{celda(c, f[c])}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Tarjeta>
        );
      })}
    </>
  );
}

export default async function PaginaIndicador({ params }: Props) {
  if (process.env.MOCK_DATA === '1') await connection();
  const { id } = await params;
  const s = await obtenerSnapshot();
  const ind = s.indicadores[id];
  if (!ind) notFound();
  const formato = FORMATO[ind.id] ?? tipoPorUnidad(ind.unidad);
  const series: SerieGrafico[] = [];
  const base = ind.series?.completa?.length ? ind.series.completa : ind.serie;
  if (base && base.length > 1) series.push({ id: 'v', nombre: ind.nombre, puntos: aligerar(base, 1500, 400), color: COLORES[0] });
  Object.entries(ind.series ?? {})
    .filter(([k, v]) => k !== 'completa' && v.length > 0)
    .forEach(([k, v], i) =>
      series.push({ id: `s${i}`, nombre: k === 'umbral' ? 'Umbral' : k, puntos: aligerar(v, 1500, 400), color: k === 'umbral' ? 'var(--rojo)' : COLORES[(i + 1) % COLORES.length], escalonada: k === 'umbral', discontinua: k === 'umbral' }),
    );
  const modulo = ANCLAS.find((a) => a.modulo === ind.modulo);
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <nav aria-label="Migas" className="no-imprimir mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href={modulo ? `/#${modulo.id}` : '/'} className="enlace">
          ← Volver a {modulo ? modulo.titulo : 'la portada'}
        </Link>
        <BotonImprimir />
      </nav>
      <LimiteError nombre={ind.nombre}>
        <header className="mb-4">
          <p className="cifra text-xs text-texto-2">
            {ind.id} · {ind.modulo}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{ind.nombre}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Semaforo valor={ind.semaforo} etiqueta="Semáforo del indicador" tamano="lg" />
            <ValorIndicador ind={ind} />
          </div>
          {ind.stale ? <AvisoStale className="mt-2" actualizadoEn={ind.actualizadoEn} /> : null}
        </header>
        <div className="flex flex-col gap-4">
          <Tarjeta className="flex flex-col gap-2">
            {ind.ayuda ? <p className="text-sm">{ind.ayuda}</p> : null}
            {ind.proximidad !== undefined && ind.proximidad !== null ? <BarraProximidad valor={ind.proximidad} /> : null}
            <Umbrales umbrales={ind.umbrales} />
            <NotasIndicador notas={ind.notas} />
            {ind.citaVideo ? <CitaVideo texto={ind.citaVideo.texto} t={ind.citaVideo.t} /> : null}
            <InsigniaFuente fuente={ind.fuente} actualizadoEn={ind.actualizadoEn} />
          </Tarjeta>
          {series.length ? (
            <Tarjeta>
              <TituloTarjeta nivel={2}>Serie</TituloTarjeta>
              <div className="mt-2">
                <GraficoSerie titulo={ind.nombre} series={series} formato={formato} rangoInicial="Máx" grande />
              </div>
            </Tarjeta>
          ) : null}
          <TablasExtra extra={ind.extra} />
        </div>
      </LimiteError>
    </main>
  );
}

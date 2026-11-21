'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { Punto } from '@/lib/types';
import { fecha } from '@/lib/calc/formato';
import { VistaTabla } from './VistaTabla';
import { formatear, formatearEje, type TipoFormato } from './utilidades';

export type SerieGrafico = {
  id: string;
  nombre: string;
  puntos: Punto[];
  color: string;
  discontinua?: boolean;
  /** Dibuja la serie en escalones (umbral 0,5 × ATH(d)). */
  escalonada?: boolean;
};

export type ReferenciaGrafico = { y: number; etiqueta: string; color?: string };
export type AnotacionGrafico = { date: string; texto: string };

const RANGOS = [
  { id: '3M', dias: 91 },
  { id: '6M', dias: 182 },
  { id: '1A', dias: 365 },
  { id: '5A', dias: 1826 },
  { id: 'Máx', dias: Infinity },
] as const;
export type IdRango = (typeof RANGOS)[number]['id'];

const DIA = 86_400_000;

type Fila = { ts: number; date: string } & Record<string, number | string | null | undefined>;

/** Parte cada serie en tramos donde hay huecos (no se interpola) y la fusiona por fecha. */
function construirFilas(series: SerieGrafico[]) {
  const mapa = new Map<string, Fila>();
  const claves: Array<{ clave: string; serie: SerieGrafico }> = [];
  for (const s of series) {
    const pts = [...s.puntos].filter((p) => Number.isFinite(p.value)).sort((a, b) => a.date.localeCompare(b.date));
    const difs: number[] = [];
    for (let i = 1; i < pts.length; i++) difs.push((Date.parse(pts[i].date) - Date.parse(pts[i - 1].date)) / DIA);
    let tramo = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0 && !s.escalonada) {
        const d = difs[i - 1];
        const vecinos = difs.slice(Math.max(0, i - 6), i - 1).concat(difs.slice(i, i + 5)).sort((a, b) => a - b);
        const med = vecinos.length ? vecinos[Math.floor(vecinos.length / 2)] : d;
        if (d > 10 && d > med * 5) tramo++;
      }
      const clave = `${s.id}__${tramo}`;
      if (!claves.some((c) => c.clave === clave)) claves.push({ clave, serie: s });
      const p = pts[i];
      const fila = mapa.get(p.date) ?? ({ ts: Date.parse(p.date), date: p.date } as Fila);
      fila[clave] = p.value;
      fila[`v_${s.id}`] = p.value;
      mapa.set(p.date, fila);
    }
  }
  const filas = [...mapa.values()].sort((a, b) => a.ts - b.ts);
  return { filas, claves };
}

function TooltipSerie({
  active,
  payload,
  label,
  series,
  formato,
}: TooltipProps<number, string> & { series: SerieGrafico[]; formato: TipoFormato }) {
  if (!active || !payload || payload.length === 0) return null;
  const fila = payload[0]?.payload as Fila | undefined;
  if (!fila) return null;
  return (
    <div className="rounded-md border border-borde-fuerte bg-superficie px-2 py-1.5 text-xs shadow-lg">
      <p className="cifra mb-1 text-texto-2">{fecha(fila.date ?? new Date(Number(label)).toISOString())}</p>
      <ul>
        {series.map((s) => {
          const v = fila[`v_${s.id}`];
          if (typeof v !== 'number') return null;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-0.5 w-3" style={{ background: s.color }} />
              <span className="text-texto-2">{s.nombre}:</span>
              <span className="cifra text-texto">{formatear(v, formato)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Gráfico de líneas (Recharts) con ReferenceLine para umbrales y selector de rango.
 * El área del gráfico tiene role="img" con un resumen; «Ver datos en tabla» muestra los datos.
 */
export function GraficoSerie({
  titulo,
  series,
  referencias = [],
  anotaciones = [],
  banda,
  formato = 'num',
  rangoInicial = '1A',
  conRangos = true,
  rangos = ['3M', '6M', '1A', '5A', 'Máx'],
  grande = false,
  dominioY,
  className,
}: {
  titulo: string;
  series: SerieGrafico[];
  referencias?: ReferenciaGrafico[];
  anotaciones?: AnotacionGrafico[];
  /** Banda horizontal sombreada (p. ej., zona ≤ 1 $/h). */
  banda?: { y1: number; y2: number; etiqueta: string };
  formato?: TipoFormato;
  rangoInicial?: IdRango;
  conRangos?: boolean;
  /** Rangos que se ofrecen (en la portada, solo hasta 1A: la serie completa está en la página de detalle). */
  rangos?: IdRango[];
  grande?: boolean;
  dominioY?: [number | 'auto', number | 'auto'];
  className?: string;
}) {
  const [rango, setRango] = useState<IdRango>(rangoInicial);
  const { filas, claves } = useMemo(() => construirFilas(series), [series]);

  const visibles = useMemo(() => {
    if (filas.length === 0) return filas;
    const dias = RANGOS.find((r) => r.id === rango)?.dias ?? Infinity;
    if (!Number.isFinite(dias)) return filas;
    const desde = filas[filas.length - 1].ts - dias * DIA;
    return filas.filter((f) => f.ts >= desde);
  }, [filas, rango]);

  const resumen = useMemo(() => {
    if (visibles.length === 0) return `${titulo}: sin datos.`;
    const partes = series.map((s) => {
      const vals = visibles.filter((f) => typeof f[`v_${s.id}`] === 'number');
      if (vals.length === 0) return `${s.nombre}: sin datos en el rango`;
      const u = vals[vals.length - 1];
      const p = vals[0];
      const nums = vals.map((f) => f[`v_${s.id}`] as number);
      return `${s.nombre}: ${formatear(p[`v_${s.id}`] as number, formato)} el ${fecha(p.date)} y ${formatear(u[`v_${s.id}`] as number, formato)} el ${fecha(u.date)} (mínimo ${formatear(Math.min(...nums), formato)}, máximo ${formatear(Math.max(...nums), formato)})`;
    });
    const refs = referencias.map((r) => `${r.etiqueta}: ${formatear(r.y, formato)}`);
    return `${titulo}, rango ${rango}. ${partes.join('. ')}.${refs.length ? ` ${refs.join('. ')}.` : ''}`;
  }, [visibles, series, referencias, titulo, rango, formato]);

  const filasTabla = useMemo(
    () =>
      [...visibles].reverse().map((f) => [
        fecha(f.date),
        ...series.map((s) => {
          const v = f[`v_${s.id}`];
          return typeof v === 'number' ? formatear(v, formato) : '—';
        }),
      ]),
    [visibles, series, formato],
  );

  const span = visibles.length > 1 ? (visibles[visibles.length - 1].ts - visibles[0].ts) / DIA : 0;
  const fmtTick = (ts: number) => {
    const d = new Date(ts);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(d.getUTCFullYear());
    if (span > 1100) return yy;
    if (span > 200) return `${mm}/${yy.slice(2)}`;
    return `${dd}/${mm}`;
  };

  if (filas.length === 0) return null;

  return (
    <div className={clsx('w-full', className)}>
      {conRangos ? (
        <div role="group" aria-label={`Rango de ${titulo}`} className="no-imprimir mb-2 flex flex-wrap gap-1">
          {RANGOS.filter((r) => rangos.includes(r.id)).map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={rango === r.id}
              onClick={() => setRango(r.id)}
              className={clsx(
                'min-w-9 rounded-md border px-2 py-0.5 text-xs',
                rango === r.id ? 'border-azul bg-azul/15 font-semibold text-texto' : 'border-borde text-texto-2 hover:border-borde-fuerte',
              )}
            >
              {r.id}
            </button>
          ))}
        </div>
      ) : null}
      <div role="img" aria-label={resumen} className={clsx('w-full', grande ? 'h-[220px] sm:h-[380px]' : 'h-[180px] sm:h-[240px]')}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibles} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rejilla)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={fmtTick}
              stroke="var(--borde-fuerte)"
              minTickGap={24}
            />
            <YAxis
              width={52}
              stroke="var(--borde-fuerte)"
              tickFormatter={(v: number) => formatearEje(v, formato)}
              domain={dominioY ?? ['auto', 'auto']}
            />
            <Tooltip content={<TooltipSerie series={series} formato={formato} />} />
            {banda ? (
              <ReferenceArea y1={banda.y1} y2={banda.y2} fill="var(--rojo)" fillOpacity={0.08} stroke="none" ifOverflow="extendDomain" />
            ) : null}
            {referencias.map((r, i) => (
              <ReferenceLine
                key={i}
                y={r.y}
                stroke={r.color ?? 'var(--rojo)'}
                strokeDasharray="5 4"
                ifOverflow="extendDomain"
                label={{ value: r.etiqueta, position: 'insideTopLeft', fill: 'var(--texto-2)', fontSize: 11 }}
              />
            ))}
            {anotaciones
              .filter((a) => visibles.length && Date.parse(a.date) >= visibles[0].ts)
              .map((a, i) => (
                <ReferenceLine
                  key={`a${i}`}
                  x={Date.parse(a.date)}
                  stroke="var(--ambar)"
                  strokeDasharray="2 3"
                  label={{ value: a.texto, position: 'insideTopRight', fill: 'var(--texto-2)', fontSize: 11 }}
                />
              ))}
            {claves.map(({ clave, serie }) => (
              <Line
                key={clave}
                dataKey={clave}
                name={serie.nombre}
                type={serie.escalonada ? 'stepAfter' : 'linear'}
                stroke={serie.color}
                strokeWidth={serie.escalonada ? 1.25 : 1.75}
                strokeDasharray={serie.discontinua ? '5 4' : undefined}
                dot={serie.puntos.length <= 5 ? { r: 3, fill: serie.color } : false}
                activeDot={{ r: 3 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 ? (
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-texto-2" aria-label="Leyenda">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block w-4 border-t-2"
                style={{ borderColor: s.color, borderStyle: s.discontinua ? 'dashed' : 'solid' }}
              />
              {s.nombre}
            </li>
          ))}
        </ul>
      ) : null}
      <VistaTabla
        titulo={`${titulo} (rango ${rango})`}
        columnas={['Fecha', ...series.map((s) => s.nombre)]}
        filas={filasTabla}
        numericas={series.map((_, i) => i + 1)}
      />
    </div>
  );
}

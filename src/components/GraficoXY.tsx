'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { num } from '@/lib/calc/formato';
import { VistaTabla } from './VistaTabla';

export type SerieXY = { id: string; nombre: string; color: string; puntos: Array<{ x: number; y: number }>; discontinua?: boolean };

type Fila = { x: number } & Record<string, number | undefined>;

function TooltipXY({ active, payload, series, ejeX }: TooltipProps<number, string> & { series: SerieXY[]; ejeX: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const f = payload[0]?.payload as Fila | undefined;
  if (!f) return null;
  return (
    <div className="rounded-md border border-borde-fuerte bg-superficie px-2 py-1.5 text-xs shadow-lg">
      <p className="cifra mb-1 text-texto-2">
        {ejeX}: {num(f.x, 0)}
      </p>
      {series.map((s) =>
        typeof f[s.id] === 'number' ? (
          <p key={s.id}>
            <span className="text-texto-2">{s.nombre}: </span>
            <span className="cifra">{num(f[s.id] as number, 1)}</span>
          </p>
        ) : null,
      )}
    </div>
  );
}

/** Líneas sobre un eje X numérico (p. ej., sesiones desde el máximo). */
export function GraficoXY({
  titulo,
  series,
  ejeX,
  referenciaY,
  referenciaX,
  className,
}: {
  titulo: string;
  series: SerieXY[];
  ejeX: string;
  referenciaY?: { y: number; etiqueta: string };
  referenciaX?: { x: number; etiqueta: string };
  className?: string;
}) {
  const filas = useMemo(() => {
    const m = new Map<number, Fila>();
    for (const s of series) {
      for (const p of s.puntos) {
        const f = m.get(p.x) ?? ({ x: p.x } as Fila);
        f[s.id] = p.y;
        m.set(p.x, f);
      }
    }
    return [...m.values()].sort((a, b) => a.x - b.x);
  }, [series]);

  if (filas.length === 0) return null;

  const resumen =
    `${titulo}. ` +
    series
      .map((s) => {
        if (s.puntos.length === 0) return `${s.nombre}: sin datos`;
        const u = s.puntos[s.puntos.length - 1];
        const min = s.puntos.reduce((a, b) => (b.y < a.y ? b : a));
        return `${s.nombre}: ${num(u.y, 1)} en la sesión ${num(u.x, 0)}; mínimo ${num(min.y, 1)} en la sesión ${num(min.x, 0)}`;
      })
      .join('. ') +
    '.';

  const muestra = filas.filter((_, i) => i % 10 === 0 || i === filas.length - 1);

  return (
    <div className={clsx('w-full', className)}>
      <div role="img" aria-label={resumen} className="h-[180px] w-full sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filas} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rejilla)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} stroke="var(--borde-fuerte)" tickFormatter={(v: number) => num(v, 0)} />
            <YAxis width={44} stroke="var(--borde-fuerte)" tickFormatter={(v: number) => num(v, 0)} domain={['auto', 'auto']} />
            <Tooltip content={<TooltipXY series={series} ejeX={ejeX} />} />
            {referenciaY ? (
              <ReferenceLine y={referenciaY.y} stroke="var(--borde-fuerte)" strokeDasharray="4 4" label={{ value: referenciaY.etiqueta, position: 'insideTopLeft', fill: 'var(--texto-2)', fontSize: 11 }} />
            ) : null}
            {referenciaX ? (
              <ReferenceLine x={referenciaX.x} stroke="var(--borde-fuerte)" strokeDasharray="4 4" label={{ value: referenciaX.etiqueta, position: 'insideTopRight', fill: 'var(--texto-2)', fontSize: 11 }} />
            ) : null}
            {series.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                name={s.nombre}
                stroke={s.color}
                strokeWidth={1.75}
                strokeDasharray={s.discontinua ? '5 4' : undefined}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-texto-2" aria-label="Leyenda">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block w-4 border-t-2" style={{ borderColor: s.color, borderStyle: s.discontinua ? 'dashed' : 'solid' }} />
            {s.nombre}
          </li>
        ))}
      </ul>
      <VistaTabla
        titulo={`${titulo} (una de cada 10 sesiones)`}
        columnas={[ejeX, ...series.map((s) => s.nombre)]}
        filas={muestra.map((f) => [num(f.x, 0), ...series.map((s) => (typeof f[s.id] === 'number' ? num(f[s.id] as number, 1) : '—'))])}
        numericas={series.map((_, i) => i + 1)}
      />
    </div>
  );
}

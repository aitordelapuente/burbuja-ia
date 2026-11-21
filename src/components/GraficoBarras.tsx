'use client';

import clsx from 'clsx';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { VistaTabla } from './VistaTabla';
import { formatear, formatearEje, type TipoFormato } from './utilidades';

export type FilaBarras = {
  etiqueta: string;
  valor: number | null;
  /** Valor de la línea secundaria (eje derecho), opcional. */
  linea?: number | null;
  /** Color de la barra (por defecto, el de la serie). */
  color?: string;
  /** Texto adicional para la tabla y el tooltip (p. ej., «dudoso»). */
  nota?: string;
};

function TooltipBarras({
  active,
  payload,
  formato,
  formatoLinea,
  nombre,
  nombreLinea,
}: TooltipProps<number, string> & { formato: TipoFormato; formatoLinea: TipoFormato; nombre: string; nombreLinea?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const f = payload[0]?.payload as FilaBarras | undefined;
  if (!f) return null;
  return (
    <div className="rounded-md border border-borde-fuerte bg-superficie px-2 py-1.5 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-texto">{f.etiqueta}</p>
      <p>
        <span className="text-texto-2">{nombre}: </span>
        <span className="cifra">{f.valor === null ? 'sin dato' : formatear(f.valor, formato)}</span>
      </p>
      {nombreLinea && f.linea !== undefined ? (
        <p>
          <span className="text-texto-2">{nombreLinea}: </span>
          <span className="cifra">{f.linea === null ? 'sin dato' : formatear(f.linea, formatoLinea)}</span>
        </p>
      ) : null}
      {f.nota ? <p className="text-ambar-tx">{f.nota}</p> : null}
    </div>
  );
}

/** Barras (Recharts) con línea secundaria opcional y escala logarítmica opcional. */
export function GraficoBarras({
  titulo,
  filas,
  nombre,
  formato = 'num',
  color = 'var(--azul)',
  nombreLinea,
  formatoLinea = 'num',
  colorLinea = 'var(--violeta)',
  log = false,
  className,
}: {
  titulo: string;
  filas: FilaBarras[];
  nombre: string;
  formato?: TipoFormato;
  color?: string;
  nombreLinea?: string;
  formatoLinea?: TipoFormato;
  colorLinea?: string;
  log?: boolean;
  className?: string;
}) {
  if (filas.length === 0) return null;
  const conLinea = !!nombreLinea && filas.some((f) => typeof f.linea === 'number');
  const resumen =
    `${titulo}. ` +
    filas
      .map(
        (f) =>
          `${f.etiqueta}: ${f.valor === null ? 'sin dato' : formatear(f.valor, formato)}` +
          (conLinea && f.linea !== undefined ? ` (${nombreLinea} ${f.linea === null ? 'sin dato' : formatear(f.linea, formatoLinea)})` : '') +
          (f.nota ? ` [${f.nota}]` : ''),
      )
      .join('; ') +
    '.';
  // En escala logarítmica, los valores nulos o ≤ 0 no se dibujan.
  const datos = filas.map((f) => ({ ...f, valor: log && f.valor !== null && f.valor <= 0 ? null : f.valor }));
  return (
    <div className={clsx('w-full', className)}>
      <div role="img" aria-label={resumen} className="h-[180px] w-full sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 8, right: conLinea ? 4 : 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rejilla)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="etiqueta" stroke="var(--borde-fuerte)" interval={0} tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="izq"
              width={56}
              stroke="var(--borde-fuerte)"
              scale={log ? 'log' : 'auto'}
              domain={log ? ['auto', 'auto'] : [0, 'auto']}
              allowDataOverflow={false}
              tickFormatter={(v: number) => formatearEje(v, formato)}
            />
            {conLinea ? (
              <YAxis
                yAxisId="der"
                orientation="right"
                width={44}
                stroke="var(--borde-fuerte)"
                tickFormatter={(v: number) => formatearEje(v, formatoLinea)}
              />
            ) : null}
            <Tooltip
              cursor={{ fill: 'var(--superficie-2)' }}
              content={<TooltipBarras formato={formato} formatoLinea={formatoLinea} nombre={nombre} nombreLinea={nombreLinea} />}
            />
            <Bar yAxisId="izq" dataKey="valor" name={nombre} fill={color} isAnimationActive={false} radius={[3, 3, 0, 0]}>
              {datos.map((f, i) => (
                <Cell key={i} fill={f.color ?? color} fillOpacity={f.nota ? 0.55 : 1} />
              ))}
            </Bar>
            {conLinea ? (
              <Line
                yAxisId="der"
                dataKey="linea"
                name={nombreLinea}
                stroke={colorLinea}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {conLinea ? (
        <ul className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-texto-2" aria-label="Leyenda">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            {nombre}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block w-4 border-t-2" style={{ borderColor: colorLinea }} />
            {nombreLinea}
          </li>
        </ul>
      ) : null}
      <VistaTabla
        titulo={titulo}
        columnas={['Periodo', nombre, ...(conLinea && nombreLinea ? [nombreLinea] : []), 'Nota']}
        filas={filas.map((f) => [
          f.etiqueta,
          f.valor === null ? 'sin dato' : formatear(f.valor, formato),
          ...(conLinea ? [f.linea === null || f.linea === undefined ? '—' : formatear(f.linea, formatoLinea)] : []),
          f.nota ?? '',
        ])}
        numericas={conLinea ? [1, 2] : [1]}
      />
    </div>
  );
}

import clsx from 'clsx';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { IRP } from '@/lib/config';
import { num } from '@/lib/calc/formato';
import { META_SEMAFORO } from './utilidades';
import { Semaforo } from './Semaforo';

type Banda = { desde: number; hasta: number; semaforo: TSemaforo };

const BANDAS_IRP: Banda[] = IRP.bandas.map((b, i, arr) => ({
  desde: i === 0 ? 0 : arr[i - 1].hasta,
  hasta: Math.min(100, b.hasta),
  semaforo: b.semaforo,
}));

function punto(v: number, r: number) {
  const ang = Math.PI * (1 - v / 100);
  return { x: 100 + r * Math.cos(ang), y: 100 - r * Math.sin(ang) };
}

function arco(desde: number, hasta: number, r: number) {
  const a = punto(desde, r);
  const b = punto(hasta, r);
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${r},${r} 0 0 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
}

/**
 * Gauge semicircular 0–100 con bandas del semáforo (sin animaciones).
 * role="meter" con aria-valuenow y texto.
 */
export function Gauge({
  valor,
  semaforo,
  etiqueta,
  textoValor,
  textoEstado,
  bandas = BANDAS_IRP,
  unidad = '',
  className,
}: {
  valor: number | null;
  semaforo: TSemaforo;
  etiqueta: string;
  textoValor?: string;
  textoEstado?: string;
  bandas?: Banda[];
  unidad?: string;
  className?: string;
}) {
  const v = valor === null || !Number.isFinite(valor) ? null : Math.max(0, Math.min(100, valor));
  const texto = textoValor ?? (v === null ? '—' : num(v, 0));
  const aguja = v === null ? null : punto(v, 70);
  const estado = textoEstado ?? META_SEMAFORO[semaforo].texto;
  return (
    <div className={clsx('flex flex-col items-center', className)}>
      <div
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v ?? 0}
        aria-valuetext={v === null ? 'Sin dato' : `${texto}${unidad} · ${estado}`}
        className="w-full max-w-[260px]"
      >
        <svg viewBox="0 0 200 120" className="block w-full" aria-hidden="true">
          <path d={arco(0, 100, 80)} fill="none" stroke="var(--superficie-2)" strokeWidth={18} />
          {bandas.map((b, i) => (
            <path
              key={i}
              d={arco(b.desde + (i ? 0.6 : 0), b.hasta, 80)}
              fill="none"
              stroke={META_SEMAFORO[b.semaforo].color}
              strokeOpacity={0.85}
              strokeWidth={18}
            />
          ))}
          {bandas.slice(1).map((b, i) => {
            const p = punto(b.desde, 96);
            return (
              <text key={i} x={p.x} y={p.y} fontSize={8} textAnchor="middle" fill="var(--texto-2)" className="cifra">
                {b.desde}
              </text>
            );
          })}
          {aguja ? (
            <>
              <line x1={100} y1={100} x2={aguja.x} y2={aguja.y} stroke="var(--texto)" strokeWidth={3} strokeLinecap="round" />
              <circle cx={100} cy={100} r={5} fill="var(--texto)" />
            </>
          ) : null}
          <text x={100} y={92} textAnchor="middle" fontSize={26} fontWeight={700} fill="var(--texto)" className="cifra">
            {texto}
            {unidad ? <tspan fontSize={14}>{unidad}</tspan> : null}
          </text>
        </svg>
      </div>
      <Semaforo valor={semaforo} texto={estado} etiqueta={`${etiqueta}: estado`} className="-mt-1" />
    </div>
  );
}

/** Gauge del IRP con la regla de anulación y el aviso de IRP parcial. */
export function GaugeIRP({
  irp,
}: {
  irp: { valor: number | null; parcial: boolean; faltan: string[]; semaforo: TSemaforo; etiqueta: string; anulado: boolean };
}) {
  if (irp.anulado) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Gauge valor={100} semaforo="rojo" etiqueta="Índice de Riesgo de Pinchazo" textoValor="100" textoEstado="PINCHAZO" />
        <p className="text-center text-sm font-semibold text-rojo-tx">100 · PINCHAZO (criterio Polymarket)</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <Gauge valor={irp.valor} semaforo={irp.semaforo} etiqueta="Índice de Riesgo de Pinchazo" textoEstado={irp.etiqueta} />
      {irp.parcial && irp.valor !== null ? (
        <p className="text-center text-xs text-ambar-tx">IRP parcial (faltan: {irp.faltan.join(', ')})</p>
      ) : null}
      {irp.valor === null ? <p className="text-center text-xs text-gris-tx">Sin dato. No mostramos estimaciones.</p> : null}
    </div>
  );
}

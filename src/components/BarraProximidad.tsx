import clsx from 'clsx';
import type { Semaforo } from '@/lib/types';
import { CONDICIONES } from '@/lib/config';
import { num } from '@/lib/calc/formato';
import { META_SEMAFORO } from './utilidades';

function semaforoProximidad(p: number): Semaforo {
  if (p >= 100) return 'rojo';
  if (p >= CONDICIONES.estados.muyCerca) return 'naranja';
  if (p >= CONDICIONES.estados.vigilancia) return 'ambar';
  return 'verde';
}

/** Barra de proximidad 0–100 al umbral (100 = condición cumplida). */
export function BarraProximidad({
  valor,
  semaforo,
  etiqueta = 'Proximidad al umbral',
  className,
}: {
  valor: number | null | undefined;
  semaforo?: Semaforo;
  etiqueta?: string;
  className?: string;
}) {
  const v = valor === null || valor === undefined || !Number.isFinite(valor) ? null : Math.max(0, Math.min(100, valor));
  const s = v === null ? 'sin_dato' : (semaforo ?? semaforoProximidad(v));
  const color = META_SEMAFORO[s].color;
  return (
    <div className={clsx('w-full', className)}>
      <div className="mb-1 flex items-baseline justify-between text-[11px] text-texto-2">
        <span>{etiqueta}</span>
        <span className="cifra">{v === null ? 'sin dato' : `${num(v, 0)}/100`}</span>
      </div>
      <div
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v ?? 0}
        aria-valuetext={v === null ? 'Sin dato' : `${num(v, 0)} sobre 100`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-superficie-2 ring-1 ring-borde"
      >
        {v !== null ? (
          <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
        ) : null}
        {/* marcas de 60 y 85 */}
        <span aria-hidden="true" className="absolute inset-y-0 w-px bg-borde-fuerte" style={{ left: '60%' }} />
        <span aria-hidden="true" className="absolute inset-y-0 w-px bg-borde-fuerte" style={{ left: '85%' }} />
      </div>
    </div>
  );
}

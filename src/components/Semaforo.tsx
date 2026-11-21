import clsx from 'clsx';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { META_SEMAFORO } from './utilidades';

/**
 * Semáforo accesible: nunca depende solo del color (icono ● ▲ ■ ○ + texto)
 * y expone el nivel con aria-valuenow (0 = sin dato … 4 = rojo).
 */
export function Semaforo({
  valor,
  texto,
  etiqueta = 'Semáforo',
  tamano = 'md',
  className,
}: {
  valor: TSemaforo;
  /** Texto que sustituye al nombre del color (p. ej., «Tensión» o «CUMPLIDA»). */
  texto?: string;
  etiqueta?: string;
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const m = META_SEMAFORO[valor] ?? META_SEMAFORO.sin_dato;
  const t = texto ?? m.texto;
  return (
    <span
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={m.nivel}
      aria-valuetext={texto && texto !== m.texto ? `${t} (${m.texto.toLowerCase()})` : t}
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
        tamano === 'sm' && 'px-2 py-0.5 text-[11px]',
        tamano === 'md' && 'px-2.5 py-0.5 text-xs',
        tamano === 'lg' && 'px-3 py-1 text-sm',
        className,
      )}
      style={{ borderColor: m.color, background: `color-mix(in srgb, ${m.color} 10%, transparent)` }}
    >
      <span aria-hidden="true" className={clsx(m.clase, 'leading-none')}>
        {m.icono}
      </span>
      <span className={m.claseTexto}>{t}</span>
    </span>
  );
}

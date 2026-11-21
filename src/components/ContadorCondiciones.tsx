import clsx from 'clsx';
import Link from 'next/link';
import type { Condicion } from '@/lib/types';
import { COLOR_BLOQUE } from './utilidades';

/** Contador X/6 de condiciones en la ventana de 90 días. */
export function ContadorCondiciones({
  n,
  enVentana,
  condiciones,
  className,
}: {
  n: number;
  enVentana: string[];
  condiciones: Pick<Condicion, 'id' | 'bloque' | 'nombre'>[];
  className?: string;
}) {
  const faltan = Math.max(0, 3 - n);
  return (
    <div className={clsx('flex flex-col items-center text-center', className)}>
      <p
        className="cifra text-5xl font-bold leading-none text-texto"
        aria-label={`${n} de 6 condiciones en ventana`}
      >
        {n}
        <span className="text-2xl text-texto-2">/6</span>
      </p>
      <p className="mt-1 text-sm text-texto-2">condiciones en ventana</p>
      <ul className="mt-3 flex gap-1.5" aria-label="Condiciones en ventana">
        {condiciones.map((c) => {
          const dentro = enVentana.includes(c.id);
          const color = COLOR_BLOQUE[c.bloque]?.color ?? 'var(--gris)';
          return (
            <li key={c.id}>
              <Link
                href={`/condicion/${c.id}`}
                className="cifra flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold"
                style={{ borderColor: color, background: dentro ? color : 'transparent', color: dentro ? 'var(--sobre-color)' : 'var(--texto)' }}
                aria-label={`${c.id.toUpperCase()}: ${c.nombre}. ${dentro ? 'En ventana' : 'Fuera de ventana'}`}
              >
                {c.id.slice(1)}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className={clsx('mt-2 text-xs', n >= 3 ? 'font-semibold text-rojo-tx' : 'text-texto-2')}>
        {n >= 3 ? 'Criterio de pinchazo cumplido' : `Faltan ${faltan} para el criterio de pinchazo`}
      </p>
    </div>
  );
}

import clsx from 'clsx';
import { TEXTOS } from '@/lib/config';

/** Estado vacío: nunca se muestran estimaciones. */
export function SinDato({ className, detalle }: { className?: string; detalle?: string }) {
  return (
    <p data-testid="sin-dato" className={clsx('flex items-start gap-2 text-sm text-gris-tx', className)}>
      <span aria-hidden="true" className="text-gris">
        ○
      </span>
      <span>
        {TEXTOS.sinDato}
        {detalle ? <span className="block text-xs">{detalle}</span> : null}
      </span>
    </p>
  );
}

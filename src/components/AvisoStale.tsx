import clsx from 'clsx';
import { Clock } from 'lucide-react';
import { fechaCorta, fechaHoraMadrid } from '@/lib/calc/formato';

/** «Dato del dd/mm hh:mm; la fuente no responde» (sección 13). */
export function textoStale(actualizadoEn: string | null | undefined): string {
  if (!actualizadoEn) return 'Dato antiguo; la fuente no responde';
  let cuando: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(actualizadoEn)) {
    cuando = fechaCorta(actualizadoEn);
  } else {
    const fh = fechaHoraMadrid(actualizadoEn); // dd/mm/aaaa hh:mm
    cuando = fh === '—' ? fechaCorta(actualizadoEn) : `${fh.slice(0, 5)} ${fh.slice(11)}`;
  }
  return `Dato del ${cuando}; la fuente no responde`;
}

export function AvisoStale({ actualizadoEn, className }: { actualizadoEn: string | null | undefined; className?: string }) {
  return (
    <p
      role="status"
      data-testid="aviso-stale"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border border-ambar px-2 py-1 text-xs text-ambar-tx',
        className,
      )}
    >
      <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{textoStale(actualizadoEn)}</span>
    </p>
  );
}

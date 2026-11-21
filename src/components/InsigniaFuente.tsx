import clsx from 'clsx';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Indicador } from '@/lib/types';
import { TEXTOS } from '@/lib/config';
import { fecha, fechaHoraMadrid } from '@/lib/calc/formato';

export function cuandoTexto(iso: string | null | undefined): string {
  if (!iso) return '—';
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? fecha(iso) : fechaHoraMadrid(iso);
}

/** Insignia «Dato del vídeo, sin verificar» (regla de oro, sección 8). */
export function InsigniaSinVerificar({ className, texto = TEXTOS.sinVerificar }: { className?: string; texto?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-ambar px-2 py-0.5 text-[11px] font-semibold text-ambar-tx',
        className,
      )}
    >
      <ShieldAlert aria-hidden="true" className="h-3 w-3" />
      {texto}
    </span>
  );
}

export function InsigniaPropuesto({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border border-borde-fuerte px-2 py-0.5 text-[11px] font-medium text-texto-2',
        className,
      )}
      title="Umbral propuesto por el panel, no por el vídeo (D11)"
    >
      {TEXTOS.umbralPropuesto}
    </span>
  );
}

/** Fuente (manual o automática), verificación y fecha del dato. */
export function InsigniaFuente({
  fuente,
  actualizadoEn,
  className,
}: {
  fuente: Indicador['fuente'] | undefined;
  actualizadoEn?: string | null;
  className?: string;
}) {
  if (!fuente) return null;
  const sinVerificar = fuente.manual && !fuente.verificado;
  return (
    <div className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-texto-2', className)}>
      <span>
        Fuente:{' '}
        {fuente.url ? (
          <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="enlace">
            {fuente.nombre}
          </a>
        ) : (
          fuente.nombre
        )}
      </span>
      <span aria-hidden="true">·</span>
      <span>{fuente.manual ? 'manual' : 'automática'}</span>
      {actualizadoEn !== undefined ? (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Dato: <span className="cifra">{cuandoTexto(actualizadoEn)}</span>
          </span>
        </>
      ) : null}
      {sinVerificar ? (
        <InsigniaSinVerificar />
      ) : fuente.verificado ? (
        <span className="inline-flex items-center gap-1 text-verde-tx">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" />
          verificado
        </span>
      ) : null}
    </div>
  );
}

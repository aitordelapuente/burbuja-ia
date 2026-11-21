import clsx from 'clsx';
import type { CodigoEscenario, Semaforo as TSemaforo, Snapshot } from '@/lib/types';
import { Semaforo } from './Semaforo';

export const SEMAFORO_ESCENARIO: Record<CodigoEscenario, TSemaforo> = {
  PINCHAZO_PM: 'rojo',
  E2: 'rojo',
  E1_CONTAGIO: 'naranja',
  E1: 'ambar',
  MIXTO: 'ambar',
  SIN: 'verde',
};

export const ETIQUETA_ESCENARIO: Record<CodigoEscenario, string> = {
  PINCHAZO_PM: 'Pinchazo',
  E2: 'Escenario 2',
  E1_CONTAGIO: 'Escenario 1 + contagio',
  E1: 'Escenario 1',
  MIXTO: 'Mixto',
  SIN: 'Sin pinchazo',
};

/** Diagnóstico de escenario (I36) con sus evidencias. */
export function DiagnosticoEscenario({
  escenario,
  compacto = false,
  className,
}: {
  escenario: Snapshot['escenario'];
  compacto?: boolean;
  className?: string;
}) {
  const sem = SEMAFORO_ESCENARIO[escenario.codigo] ?? 'sin_dato';
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <Semaforo valor={sem} texto={ETIQUETA_ESCENARIO[escenario.codigo] ?? escenario.codigo} etiqueta="Diagnóstico de escenario" className="self-start" />
      <p className={clsx('font-semibold leading-snug', compacto ? 'text-base' : 'text-lg')}>{escenario.titulo}</p>
      {escenario.evidencias.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-2">Evidencias</p>
          <ul className="mt-1 space-y-0.5 text-xs text-texto-2">
            {(compacto ? escenario.evidencias.slice(0, 4) : escenario.evidencias).map((e, i) => (
              <li key={i} className="flex gap-1.5">
                <span aria-hidden="true">·</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

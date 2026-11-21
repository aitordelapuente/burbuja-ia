import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import type { Condicion, Snapshot } from '@/lib/types';
import { CONDICIONES } from '@/lib/config';
import { fecha, fechaCorta } from '@/lib/calc/formato';
import { addDays, diffDays } from '@/lib/calc/fechas';
import { VistaTabla } from './VistaTabla';
import { COLOR_BLOQUE } from './utilidades';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Línea temporal de la ventana de 90 días (sección 4.3): de hoy − 120 días a la fecha límite,
 * banda de 90 días que termina en el último suceso y un punto por suceso (color del bloque).
 */
export function VentanaTimeline({
  ventana,
  hoy,
  condiciones,
  className,
}: {
  ventana: Snapshot['ventana'];
  hoy: string;
  condiciones: Pick<Condicion, 'id' | 'bloque' | 'nombre' | 'heredada' | 'cumplidaDesde'>[];
  className?: string;
}) {
  const inicio = addDays(hoy, -CONDICIONES.horizonteDias);
  const limite = ventana.limite && ventana.limite > hoy ? ventana.limite : hoy;
  const total = Math.max(1, diffDays(limite, inicio));
  const pos = (d: string) => Math.max(0, Math.min(100, (diffDays(d, inicio) / total) * 100));

  const sucesos = (ventana.sucesos ?? []).filter((s) => s.fecha >= inicio && s.fecha <= limite);
  const ultimo = ventana.fin ?? (sucesos.length ? sucesos.map((s) => s.fecha).sort().at(-1)! : null);
  const bandaDesde = ultimo ? addDays(ultimo, -CONDICIONES.ventanaDias) : null;
  const n = ventana.n;
  const faltan = Math.max(0, 3 - n);

  // Marcas de mes
  const marcas: Array<{ d: string; t: string }> = [];
  {
    const [y0, m0] = inicio.split('-').map(Number);
    let y = y0;
    let m = m0 + 1;
    for (let i = 0; i < 24; i++) {
      if (m > 12) {
        m = 1;
        y++;
      }
      const d = `${y}-${String(m).padStart(2, '0')}-01`;
      if (d > limite) break;
      marcas.push({ d, t: m === 1 ? `${MESES_CORTOS[0]} ${String(y).slice(2)}` : MESES_CORTOS[m - 1] });
      m++;
    }
  }

  const ids = condiciones.map((c) => c.id);
  const resumen =
    `Línea temporal de la ventana de 90 días, del ${fecha(inicio)} al ${fecha(limite)}. ` +
    (sucesos.length
      ? `Sucesos: ${sucesos.map((s) => `${s.cond.toUpperCase()} el ${fecha(s.fecha)}`).join('; ')}. `
      : 'Sin sucesos en el horizonte. ') +
    `Condiciones en ventana: ${n}/6.`;

  return (
    <div className={clsx('w-full', className)}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-lg font-semibold">
          Condiciones en ventana: <span className="cifra">{n}/6</span>
        </p>
        <p className="text-sm text-texto-2">
          {n >= 3 ? 'Criterio de pinchazo alcanzado' : `Faltan ${faltan} para el criterio de pinchazo`}
        </p>
      </div>
      {n >= 3 || ventana.pinchazo ? (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-md border border-rojo bg-rojo/10 px-3 py-2 text-sm font-semibold text-rojo-tx">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          Se cumple el criterio de pinchazo de Polymarket (3 de 6 en 90 días)
        </p>
      ) : null}

      <div role="img" aria-label={resumen} className="relative">
        <div className="relative ml-8 sm:ml-10">
          {/* banda de 90 días */}
          {bandaDesde && ultimo ? (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 rounded-sm bg-ambar/15 ring-1 ring-ambar/40"
              style={{ left: `${pos(bandaDesde)}%`, width: `${Math.max(0.5, pos(ultimo) - pos(bandaDesde))}%` }}
            />
          ) : null}
          {/* hoy */}
          <div aria-hidden="true" className="absolute inset-y-0 w-px bg-texto" style={{ left: `${pos(hoy)}%` }} />
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-rojo" />
          {ids.map((id) => {
            const c = condiciones.find((x) => x.id === id)!;
            const color = COLOR_BLOQUE[c.bloque]?.color ?? 'var(--gris)';
            const propios = sucesos.filter((s) => s.cond === id);
            return (
              <div key={id} className="relative h-6 border-b border-dashed border-borde">
                <span aria-hidden="true" className="cifra absolute -left-8 top-1 text-[11px] text-texto-2 sm:-left-10">
                  {id.toUpperCase()}
                </span>
                {propios.map((s, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    title={`${id.toUpperCase()} · ${fecha(s.fecha)}`}
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-superficie"
                    style={{ left: `${pos(s.fecha)}%`, background: color }}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="relative ml-8 h-5 text-[10px] text-texto-2 sm:ml-10 sm:text-[11px]">
          {marcas.map((m, i) => (
            <span key={m.d} className={clsx('absolute top-1 -translate-x-1/2', i % 2 === 1 && 'hidden sm:inline')} style={{ left: `${pos(m.d)}%` }}>
              {m.t}
            </span>
          ))}
        </div>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-texto-2" aria-label="Leyenda">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-azul" /> Financiero (1-3)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-violeta" /> Real (4-6)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm bg-ambar/30 ring-1 ring-ambar/50" /> Ventana de 90 días
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-px bg-texto" /> Hoy ({fechaCorta(hoy)})
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-px bg-rojo" /> Fecha límite ({fecha(ventana.limite)})
        </li>
      </ul>
      {condiciones.some((c) => c.heredada) ? (
        <ul className="mt-2 text-xs text-texto-2">
          {condiciones
            .filter((c) => c.heredada)
            .map((c) => (
              <li key={c.id}>
                {c.id.toUpperCase()}: cumplida desde {fecha(c.cumplidaDesde ?? null)}; Polymarket y el vídeo no la cuentan como suceso nuevo.
              </li>
            ))}
        </ul>
      ) : null}
      <VistaTabla
        titulo="Sucesos de la ventana"
        columnas={['Fecha', 'Condición', 'En ventana']}
        filas={(ventana.sucesos ?? []).map((s) => [fecha(s.fecha), s.cond.toUpperCase(), ventana.enVentana.includes(s.cond) ? 'Sí' : 'No'])}
      />
    </div>
  );
}

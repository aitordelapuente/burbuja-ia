import clsx from 'clsx';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { META_SEMAFORO } from './utilidades';

export type NodoRetro = { titulo: string; semaforo: TSemaforo; detalle?: string };

/** Parte un texto en líneas de como mucho n caracteres (para el SVG). */
function lineas(t: string, n = 22): string[] {
  const out: string[] = [];
  let l = '';
  for (const w of t.split(' ')) {
    if ((l + ' ' + w).trim().length > n) {
      if (l) out.push(l);
      l = w;
    } else l = (l + ' ' + w).trim();
  }
  if (l) out.push(l);
  return out.slice(0, 3);
}

/**
 * Mecanismo de retroalimentación (I37): financiación cara o cerrada → los laboratorios compran
 * menos cómputo → baja la demanda → baja el precio del alquiler → caen las ventas de chips.
 * Los nodos se colorean con el estado vivo de sus indicadores.
 */
export function DiagramaRetroalimentacion({ nodos, className }: { nodos: NodoRetro[]; className?: string }) {
  const n = nodos.length;
  const W = 1000;
  const anchoNodo = 168;
  const hueco = n > 1 ? (W - 20 - anchoNodo * n) / (n - 1) : 0;
  const x = (i: number) => 10 + i * (anchoNodo + hueco);
  const resumen =
    'Diagrama del mecanismo de retroalimentación: ' +
    nodos.map((nd) => `${nd.titulo} (${META_SEMAFORO[nd.semaforo].texto}${nd.detalle ? `; ${nd.detalle}` : ''})`).join(' → ') +
    ' → y vuelta a empezar.';
  return (
    <div className={clsx('w-full', className)}>
      <svg role="img" aria-label={resumen} viewBox={`0 0 ${W} 230`} className="hidden w-full sm:block">
        <defs>
          <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--texto-2)" />
          </marker>
        </defs>
        {nodos.map((nd, i) => {
          const m = META_SEMAFORO[nd.semaforo];
          return (
            <g key={i}>
              <rect x={x(i)} y={20} width={anchoNodo} height={120} rx={10} fill="var(--superficie-2)" stroke={m.color} strokeWidth={2.5} />
              <text x={x(i) + 12} y={44} fontSize={15} fill={m.color}>
                {m.icono}
              </text>
              <text x={x(i) + 30} y={44} fontSize={13} fontWeight={600} fill="var(--texto-2)">
                {m.texto}
              </text>
              {lineas(nd.titulo).map((l, j) => (
                <text key={j} x={x(i) + 12} y={68 + j * 18} fontSize={14} fontWeight={600} fill="var(--texto)">
                  {l}
                </text>
              ))}
              {nd.detalle
                ? lineas(nd.detalle, 26)
                    .slice(0, 1)
                    .map((l, j) => (
                      <text key={j} x={x(i) + 12} y={128} fontSize={11} fill="var(--texto-2)">
                        {l}
                      </text>
                    ))
                : null}
              {i < n - 1 ? (
                <line x1={x(i) + anchoNodo + 4} y1={80} x2={x(i + 1) - 6} y2={80} stroke="var(--texto-2)" strokeWidth={2} markerEnd="url(#flecha)" />
              ) : null}
            </g>
          );
        })}
        {n > 1 ? (
          <path
            d={`M${x(n - 1) + anchoNodo / 2},140 L${x(n - 1) + anchoNodo / 2},195 L${x(0) + anchoNodo / 2},195 L${x(0) + anchoNodo / 2},146`}
            fill="none"
            stroke="var(--texto-2)"
            strokeWidth={2}
            strokeDasharray="6 4"
            markerEnd="url(#flecha)"
          />
        ) : null}
        <text x={W / 2} y={218} fontSize={13} textAnchor="middle" fill="var(--texto-2)">
          … y menos ventas de chips encarecen aún más la financiación
        </text>
      </svg>
      {/* Versión vertical para móvil (también es la alternativa textual) */}
      <ol className="space-y-1 sm:sr-only" aria-label="Pasos del mecanismo">
        {nodos.map((nd, i) => {
          const m = META_SEMAFORO[nd.semaforo];
          return (
            <li key={i}>
              <div className="rounded-md border-2 bg-superficie-2 px-3 py-2 text-sm" style={{ borderColor: m.color }}>
                <p className="text-[11px] font-semibold">
                  <span aria-hidden="true" className={m.clase}>
                    {m.icono}{' '}
                  </span>
                  <span className={m.claseTexto}>{m.texto}</span>
                </p>
                <p className="font-semibold">{nd.titulo}</p>
                {nd.detalle ? <p className="text-xs text-texto-2">{nd.detalle}</p> : null}
              </div>
              <p aria-hidden="true" className="text-center text-texto-2">
                {i < n - 1 ? '↓' : '↺'}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

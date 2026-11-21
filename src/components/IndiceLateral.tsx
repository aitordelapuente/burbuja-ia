import Link from 'next/link';
import { List } from 'lucide-react';
import { ANCLAS } from './utilidades';

function Lista() {
  return (
    <ol className="space-y-0.5 text-sm">
      {ANCLAS.map((a) => (
        <li key={a.id}>
          <a href={`#${a.id}`} className="flex gap-2 rounded px-2 py-1 text-texto-2 hover:bg-superficie-2 hover:text-texto">
            <span className="cifra w-8 shrink-0 text-[11px] leading-5">{a.modulo}</span>
            <span>{a.titulo}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Índice lateral (escritorio, ≥ 1280 px) con las anclas de la portada. */
export function IndiceLateral() {
  return (
      <nav aria-label="Índice de secciones" className="no-imprimir sticky top-28 hidden max-h-[calc(100vh-8rem)] w-60 shrink-0 overflow-y-auto xl:block">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-texto-2">Índice</p>
        <Lista />
        <p className="mt-4 px-2 text-sm">
          <Link href="/trazabilidad" className="enlace">
            Trazabilidad vídeo → panel
          </Link>
        </p>
      </nav>
  );
}

/** Índice desplegable (móvil y tableta). */
export function IndiceMovil() {
  return (
      <details className="no-imprimir mb-2 rounded-lg border border-borde bg-superficie xl:hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
          <List aria-hidden="true" className="h-4 w-4" />
          Índice de secciones
        </summary>
        <nav aria-label="Índice de secciones (desplegable)" className="px-1 pb-2">
          <Lista />
        </nav>
      </details>
  );
}

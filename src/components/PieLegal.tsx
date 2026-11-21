import Link from 'next/link';
import { TEXTOS, VIDEO } from '@/lib/config';

/** Pie legal fijo en todas las páginas. */
export function PieLegal() {
  return (
    <footer className="mt-10 border-t border-borde bg-superficie">
      <div className="mx-auto max-w-[1600px] px-4 py-6 text-xs text-texto-2 sm:px-6">
        <p className="text-sm text-texto">{TEXTOS.pie}</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <a href={VIDEO.url} target="_blank" rel="noopener noreferrer" className="enlace">
              Vídeo: «{VIDEO.titulo}» ({VIDEO.canal})
            </a>
          </li>
          <li>
            <Link href="/trazabilidad" className="enlace">
              Trazabilidad vídeo → panel
            </Link>
          </li>
          <li>
            <Link href="/#metodologia" className="enlace">
              Metodología y fuentes
            </Link>
          </li>
          <li>
            <a href="/api/snapshot" className="enlace">
              Datos en JSON
            </a>
          </li>
        </ul>
        <p className="mt-3">Las cifras del vídeo solo se usan como semilla etiquetada. Nunca se interpola, extrapola ni inventa un valor. Código con licencia MIT.</p>
      </div>
    </footer>
  );
}

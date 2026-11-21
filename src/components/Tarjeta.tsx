import clsx from 'clsx';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { LimiteError } from './LimiteError';

/** Superficie base de todas las tarjetas. */
export function Tarjeta({
  children,
  className,
  as: Etiqueta = 'div',
  id,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section' | 'li';
  id?: string;
  'aria-labelledby'?: string;
  'data-testid'?: string;
}) {
  return (
    <Etiqueta id={id} className={clsx('tarjeta min-w-0 rounded-lg border border-borde bg-superficie p-4', className)} {...rest}>
      {children}
    </Etiqueta>
  );
}

/** Columnas en la rejilla: 12 en escritorio, 6 en tableta y 1 en móvil. */
export const COLS = {
  12: 'col-span-1 md:col-span-6 xl:col-span-12',
  9: 'col-span-1 md:col-span-6 xl:col-span-9',
  8: 'col-span-1 md:col-span-6 xl:col-span-8',
  6: 'col-span-1 md:col-span-6 xl:col-span-6',
  4: 'col-span-1 md:col-span-3 xl:col-span-4',
  3: 'col-span-1 md:col-span-3 xl:col-span-3',
  2: 'col-span-1 md:col-span-2 xl:col-span-2',
} as const;

export function Rejilla({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12', className)}>{children}</div>;
}

/** Sección de la portada con ancla, título, enlace profundo y error boundary. */
export function Modulo({
  id,
  codigo,
  titulo,
  subtitulo,
  children,
}: {
  id: string;
  codigo: string;
  titulo: string;
  subtitulo?: ReactNode;
  children: ReactNode;
}) {
  const idTitulo = `${id}-titulo`;
  return (
    <section id={id} aria-labelledby={idTitulo} className="py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={idTitulo} className="text-xl font-semibold tracking-tight sm:text-2xl">
          <span className="cifra mr-2 text-sm font-medium text-texto-2">{codigo}</span>
          {titulo}
        </h2>
        <a href={`#${id}`} className="no-imprimir inline-flex items-center gap-1 text-xs text-texto-2 hover:text-texto">
          <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="cifra">#{id}</span>
          <span className="sr-only"> (enlace directo a esta sección)</span>
        </a>
      </div>
      {subtitulo ? <div className="-mt-2 mb-4 max-w-3xl text-sm text-texto-2">{subtitulo}</div> : null}
      <LimiteError nombre={titulo}>{children}</LimiteError>
    </section>
  );
}

/** Título de tarjeta con enlace opcional al detalle. */
export function TituloTarjeta({
  children,
  href,
  codigo,
  nivel = 3,
  className,
}: {
  children: ReactNode;
  href?: string;
  codigo?: string;
  nivel?: 2 | 3 | 4;
  className?: string;
}) {
  const H = `h${nivel}` as 'h2' | 'h3' | 'h4';
  return (
    <H className={clsx('text-sm font-semibold text-texto', className)}>
      {codigo ? <span className="cifra mr-1.5 text-[11px] font-medium text-texto-2">{codigo}</span> : null}
      {href ? (
        <Link href={href} className="hover:underline">
          {children}
        </Link>
      ) : (
        children
      )}
    </H>
  );
}

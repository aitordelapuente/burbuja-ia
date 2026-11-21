'use client';

import { Printer } from 'lucide-react';

/** Abre el diálogo de impresión (vista imprimible, CU4). */
export function BotonImprimir({ texto = 'Imprimir' }: { texto?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-imprimir inline-flex items-center gap-1.5 rounded-md border border-borde px-2 py-1 text-xs text-texto-2 hover:border-borde-fuerte hover:text-texto"
    >
      <Printer aria-hidden="true" className="h-3.5 w-3.5" />
      {texto}
    </button>
  );
}

'use client';

import { useState } from 'react';

/** Id determinista (useId no casa entre servidor y cliente en este árbol). */
function idDe(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return `tabla-${(h >>> 0).toString(36)}`;
}
import { Table } from 'lucide-react';

/** Botón «Ver datos en tabla» que despliega una tabla accesible con los datos de un gráfico. */
export function VistaTabla({
  titulo,
  columnas,
  filas,
  numericas = [],
  className,
}: {
  titulo: string;
  columnas: string[];
  /** Celdas ya formateadas en es-ES. */
  filas: string[][];
  /** Índices de las columnas numéricas (alineadas a la derecha). */
  numericas?: number[];
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const id = idDe(`${titulo}|${filas.length}|${filas[0]?.join('|') ?? ''}`);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={id}
        onClick={() => setAbierta((a) => !a)}
        className="no-imprimir mt-2 inline-flex items-center gap-1.5 rounded-md border border-borde px-2 py-1 text-xs text-texto-2 hover:border-borde-fuerte hover:text-texto"
      >
        <Table aria-hidden="true" className="h-3.5 w-3.5" />
        {abierta ? 'Ocultar tabla' : 'Ver datos en tabla'}
      </button>
      <div id={id} hidden={!abierta} className="mt-2 max-h-80 overflow-auto rounded-md border border-borde" tabIndex={0} role="region" aria-label={titulo}>
        {abierta ? (
          filas.length === 0 ? (
            <p className="p-2 text-xs text-texto-2">Sin datos.</p>
          ) : (
            <table className="tabla">
              <caption className="sr-only">{titulo}</caption>
              <thead className="sticky top-0 bg-superficie">
                <tr>
                  {columnas.map((c, i) => (
                    <th key={i} scope="col" className={numericas.includes(i) ? 'num' : undefined}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i}>
                    {f.map((celda, j) =>
                      j === 0 ? (
                        <th key={j} scope="row" className="cifra font-normal text-texto">
                          {celda}
                        </th>
                      ) : (
                        <td key={j} className={numericas.includes(j) ? 'num' : undefined}>
                          {celda}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </div>
    </div>
  );
}

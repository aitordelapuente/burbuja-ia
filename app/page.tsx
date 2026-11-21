import { connection } from 'next/server';
import type { ComponentType } from 'react';
import type { Snapshot } from '@/lib/types';
import { obtenerSnapshot } from '@/components/cargarSnapshot';
import { IndiceLateral, IndiceMovil } from '@/components/IndiceLateral';
import { LimiteError } from '@/components/LimiteError';
import { BotonImprimir } from '@/components/BotonImprimir';
import { ANCLAS } from '@/components/utilidades';
import M0 from '@/components/modulos/M0';
import M1 from '@/components/modulos/M1';
import M2 from '@/components/modulos/M2';
import M3 from '@/components/modulos/M3';
import M4 from '@/components/modulos/M4';
import M5 from '@/components/modulos/M5';
import M6 from '@/components/modulos/M6';
import M7 from '@/components/modulos/M7';
import M8 from '@/components/modulos/M8';
import M9 from '@/components/modulos/M9';
import M10 from '@/components/modulos/M10';
import M11 from '@/components/modulos/M11';
import M12 from '@/components/modulos/M12';

export const revalidate = 900;

const MODULOS: Array<[ComponentType<{ s: Snapshot }>, number]> = [
  [M0, 0], [M1, 1], [M2, 2], [M3, 3], [M4, 4], [M5, 5], [M6, 6], [M7, 7], [M8, 8], [M9, 9], [M10, 10], [M11, 11], [M12, 12],
];

/** Renderiza un módulo; si su función falla en el servidor, muestra el aviso y sigue (sección 13.6). */
function ModuloSeguro({ M, i, s }: { M: ComponentType<{ s: Snapshot }>; i: number; s: Snapshot }) {
  const a = ANCLAS[i];
  try {
    const Render = M as (p: { s: Snapshot }) => React.ReactNode;
    return <LimiteError nombre={a.titulo}>{Render({ s })}</LimiteError>;
  } catch (e) {
    console.error(`[ui] Error en el módulo ${a.modulo}:`, e);
    return (
      <section id={a.id} aria-label={a.titulo} className="py-6">
        <h2 className="mb-2 text-xl font-semibold">{a.titulo}</h2>
        <p role="status" className="rounded-lg border border-ambar bg-superficie p-4 text-sm text-ambar-tx">
          No se ha podido mostrar «{a.titulo}». El resto del panel sigue funcionando.
        </p>
      </section>
    );
  }
}

export default async function Portada() {
  if (process.env.MOCK_DATA === '1') await connection();
  const s = await obtenerSnapshot();
  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 sm:px-6">
      <IndiceLateral />
      <main className="min-w-0 flex-1 pt-4">
        <IndiceMovil />
        <div className="no-imprimir flex justify-end">
          <BotonImprimir texto="Imprimir el panel" />
        </div>
        {MODULOS.map(([M, i]) => (
          <ModuloSeguro key={i} M={M} i={i} s={s} />
        ))}
      </main>
    </div>
  );
}

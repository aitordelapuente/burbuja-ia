import type { Metadata } from 'next';
import Link from 'next/link';
import citas from '../../data/seed/citas.json';
import correcciones from '../../data/seed/correcciones.json';
import { CitaVideo } from '@/components/CitaVideo';
import { BotonImprimir } from '@/components/BotonImprimir';
import { ANCLAS } from '@/components/utilidades';

export const metadata: Metadata = { title: 'Trazabilidad vídeo → panel' };

type Cita = { t: number; mmss: string; afirmacion: string; panel: string };
type Correccion = { mmss: string; subtitulo: string; correccion: string; base: string };

const lista = <T,>(x: unknown): T[] => (Array.isArray(x) ? x : x && typeof x === 'object' && Array.isArray((x as { items?: unknown }).items) ? (x as { items: T[] }).items : []) as T[];

/** Convierte «I15, I16 (M4)» en enlaces a los indicadores, condiciones y módulos. */
function Panel({ texto }: { texto: string }) {
  const partes = texto.split(/(\bI\d{2}b?\b|\bc[1-6]\b|\bM\d{1,2}\b)/);
  return (
    <>
      {partes.map((p, i) => {
        if (/^I\d{2}b?$/.test(p))
          return (
            <Link key={i} href={`/indicador/${p}`} className="enlace">
              {p}
            </Link>
          );
        if (/^c[1-6]$/.test(p))
          return (
            <Link key={i} href={`/condicion/${p}`} className="enlace">
              {p}
            </Link>
          );
        const m = ANCLAS.find((a) => a.modulo === p);
        if (m)
          return (
            <Link key={i} href={`/#${m.id}`} className="enlace">
              {p}
            </Link>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default function Trazabilidad() {
  const filas = lista<Cita>(citas);
  const corr = lista<Correccion>(correcciones);
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <nav aria-label="Migas" className="no-imprimir mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/" className="enlace">
          ← Volver al panel
        </Link>
        <BotonImprimir />
      </nav>
      <h1 className="text-2xl font-bold sm:text-3xl">Trazabilidad: afirmación del vídeo → panel</h1>
      <p className="mt-1 max-w-3xl text-sm text-texto-2">
        Cada afirmación del vídeo, con su minuto (enlace a YouTube en ese segundo) y el lugar del panel donde se refleja. {filas.length} filas.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-borde bg-superficie" tabIndex={0} role="region" aria-label="Tabla desplazable">
        <table className="tabla" data-testid="tabla-trazabilidad">
          <caption className="sr-only">Afirmaciones del vídeo y su reflejo en el panel</caption>
          <thead>
            <tr>
              <th scope="col">mm:ss</th>
              <th scope="col">Afirmación del vídeo</th>
              <th scope="col">Panel</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap">
                  <CitaVideo t={f.t} compacta />
                </td>
                <th scope="row" className="font-normal text-texto">
                  {f.afirmacion}
                </th>
                <td>
                  <Panel texto={f.panel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {corr.length ? (
        <>
          <h2 className="mt-8 text-xl font-semibold">Correcciones a los subtítulos automáticos</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-borde bg-superficie" tabIndex={0} role="region" aria-label="Tabla desplazable">
            <table className="tabla">
              <caption className="sr-only">Correcciones a los subtítulos automáticos del vídeo</caption>
              <thead>
                <tr>
                  <th scope="col">mm:ss</th>
                  <th scope="col">Subtítulo</th>
                  <th scope="col">Corrección</th>
                  <th scope="col">Base</th>
                </tr>
              </thead>
              <tbody>
                {corr.map((c, i) => (
                  <tr key={i}>
                    <td className="cifra whitespace-nowrap">{c.mmss}</td>
                    <td>{c.subtitulo}</td>
                    <th scope="row" className="font-normal text-texto">
                      {c.correccion}
                    </th>
                    <td>{c.base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}

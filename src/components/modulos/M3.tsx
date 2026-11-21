import type { Condicion } from '@/lib/types';
import { Modulo, Rejilla, COLS, Tarjeta } from '../Tarjeta';
import { TarjetaCondicion } from '../TarjetaCondicion';
import { VentanaTimeline } from '../VentanaTimeline';
import { CitaVideo } from '../CitaVideo';
import { SinDato } from '../SinDato';
import { META_ESTADO } from '../utilidades';
import type { PropsModulo } from './comun';

function resumenBloque(cs: Condicion[]): string {
  const cuenta = (e: Condicion['estado']) => cs.filter((c) => c.estado === e).length;
  const partes: string[] = [];
  const t: Array<[Condicion['estado'], string, string]> = [
    ['cumplida', 'cumplida', 'cumplidas'],
    ['muy_cerca', 'muy cerca', 'muy cerca'],
    ['vigilancia', 'en vigilancia', 'en vigilancia'],
    ['lejos', 'lejos', 'lejos'],
    ['sin_dato', 'sin dato', 'sin dato'],
  ];
  for (const [e, sg, pl] of t) {
    const n = cuenta(e);
    if (n) partes.push(`${n} ${n === 1 ? sg : pl}`);
  }
  return partes.join(' · ');
}

function Bloque({ titulo, cs, id, cita }: { titulo: string; cs: Condicion[]; id: string; cita: { t: number; texto: string } }) {
  return (
    <div className={COLS[12]}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={id} className="text-base font-semibold">
          {titulo}
        </h3>
        <p className="text-xs text-texto-2">
          {resumenBloque(cs)} · <CitaVideo t={cita.t} compacta />
        </p>
      </div>
      {cs.length === 0 ? (
        <SinDato />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12" aria-labelledby={id}>
          {cs.map((c) => (
            <li key={c.id} className="col-span-1 flex md:col-span-3 xl:col-span-4 [&>*]:w-full">
              <TarjetaCondicion c={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** M3 · Las 6 condiciones de Polymarket (#condiciones). */
export default function M3({ s }: PropsModulo) {
  const fin = s.condiciones.filter((c) => c.bloque === 'financiero');
  const real = s.condiciones.filter((c) => c.bloque === 'real');
  const cumplidas = s.condiciones.filter((c) => c.estado === 'cumplida').map((c) => c.id.toUpperCase());
  return (
    <Modulo
      id="condiciones"
      codigo="M3"
      titulo="Las 6 condiciones de Polymarket"
      subtitulo={
        <>
          El pinchazo se produce si se cumplen al menos 3 de 6 sucesos dentro de una misma ventana de 90 días.
          {cumplidas.length ? ` Hoy: ${cumplidas.join(', ')} en estado ${META_ESTADO.cumplida.texto.toLowerCase()}.` : ''}
        </>
      }
    >
      <Rejilla>
        <Bloque titulo="Pinchazo financiero (condiciones 1-3)" cs={fin} id="bloque-financiero" cita={{ t: 833, texto: 'Balance: 1 cumplida, 1 cerca, 1 plausible' }} />
        <Bloque titulo="Pinchazo de la economía real (condiciones 4-6)" cs={real} id="bloque-real" cita={{ t: 876, texto: 'Las condiciones reales están muy lejos' }} />
        <Tarjeta className={COLS[12]}>
          <h3 className="mb-2 text-base font-semibold">Línea temporal de la ventana de 90 días</h3>
          <VentanaTimeline ventana={s.ventana} hoy={s.hoy} condiciones={s.condiciones} />
          <CitaVideo className="mt-3" t={204} texto="3 de 6 sucesos en 90 días antes del 31/12/2026" />
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

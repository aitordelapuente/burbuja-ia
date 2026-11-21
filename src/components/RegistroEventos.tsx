import clsx from 'clsx';
import { ExternalLink } from 'lucide-react';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { fecha } from '@/lib/calc/formato';
import { CitaVideo } from './CitaVideo';
import { InsigniaSinVerificar } from './InsigniaFuente';
import { Semaforo } from './Semaforo';
import { esRegistro, esUrlVideo, segundoDeUrl, type Registro } from './utilidades';

export type EventoRegistro = {
  fecha: string | null;
  titulo: string;
  detalle?: string | null;
  etiqueta?: string | null;
  gravedad?: number | null;
  fuente_url?: string | null;
  verificado?: boolean | null;
  origen?: string | null;
};

/** Convierte items de los JSON manuales (forma libre) en eventos del registro. */
export function aEventos(items: unknown[], etiquetaDe?: (r: Registro) => string | null): EventoRegistro[] {
  return items.filter(esRegistro).map((r) => ({
    fecha: typeof r.fecha === 'string' ? r.fecha : null,
    titulo: String(r.titulo ?? r.nota ?? r.lab ?? 'Evento'),
    detalle: typeof r.detalle === 'string' ? r.detalle : typeof r.nota === 'string' && r.titulo ? r.nota : null,
    etiqueta: etiquetaDe ? etiquetaDe(r) : null,
    gravedad: typeof r.gravedad === 'number' ? r.gravedad : null,
    fuente_url: typeof r.fuente_url === 'string' ? r.fuente_url : null,
    verificado: typeof r.verificado === 'boolean' ? r.verificado : null,
    origen: typeof r.origen === 'string' ? r.origen : null,
  }));
}

const SEM_GRAVEDAD: Record<number, TSemaforo> = { 1: 'ambar', 2: 'ambar', 3: 'rojo' };

/** Registro cronológico de eventos, con fuente y verificación. */
export function RegistroEventos({
  eventos,
  vacio = 'No hay eventos registrados.',
  className,
}: {
  eventos: EventoRegistro[];
  vacio?: string;
  className?: string;
}) {
  if (eventos.length === 0) return <p className={clsx('text-sm text-texto-2', className)}>{vacio}</p>;
  const orden = [...eventos].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
  return (
    <ol className={clsx('space-y-3', className)}>
      {orden.map((e, i) => {
        const t = segundoDeUrl(e.fuente_url);
        const delVideo = esUrlVideo(e.fuente_url) || e.origen === 'video';
        return (
          <li key={i} className="border-l-2 border-borde-fuerte pl-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-texto-2">
              <span className="cifra">{fecha(e.fecha)}</span>
              {e.etiqueta ? <span className="rounded border border-borde px-1.5">{e.etiqueta}</span> : null}
              {e.gravedad ? (
                <Semaforo valor={SEM_GRAVEDAD[e.gravedad] ?? 'ambar'} texto={`Gravedad ${e.gravedad}`} etiqueta="Gravedad del evento" tamano="sm" />
              ) : null}
              {e.verificado === false ? <InsigniaSinVerificar texto={delVideo ? undefined : 'Sin verificar'} /> : null}
            </div>
            <p className="mt-0.5 text-sm font-medium">{e.titulo}</p>
            {e.detalle ? <p className="text-xs text-texto-2">{e.detalle}</p> : null}
            {e.fuente_url ? (
              <p className="mt-0.5 text-xs">
                {esUrlVideo(e.fuente_url) && t !== null ? (
                  <CitaVideo t={t} compacta />
                ) : (
                  <a href={e.fuente_url} target="_blank" rel="noopener noreferrer" className="enlace inline-flex items-center gap-1">
                    Fuente <ExternalLink aria-hidden="true" className="h-3 w-3" />
                  </a>
                )}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

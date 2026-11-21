import clsx from 'clsx';
import { Play } from 'lucide-react';
import { urlVideo } from '@/lib/config';
import { mmss } from '@/lib/calc/formato';

/** Cita del vídeo con enlace a YouTube en ese segundo. */
export function CitaVideo({
  texto,
  t,
  className,
  compacta = false,
}: {
  texto?: string | null;
  t: number;
  className?: string;
  compacta?: boolean;
}) {
  const marca = mmss(t);
  const enlace = (
    <a
      href={urlVideo(t)}
      target="_blank"
      rel="noopener noreferrer"
      className="enlace inline-flex items-center gap-1 whitespace-nowrap"
      aria-label={`Ver en el vídeo, minuto ${marca} (se abre YouTube en otra pestaña)`}
    >
      <Play aria-hidden="true" className="h-3 w-3" />
      <span className="cifra">{marca}</span>
    </a>
  );
  if (compacta || !texto) {
    return <span className={clsx('text-xs', className)}>{enlace}</span>;
  }
  return (
    <figure className={clsx('border-l-2 border-borde-fuerte pl-3 text-sm', className)}>
      <blockquote className="italic text-texto-2">«{texto}»</blockquote>
      <figcaption className="mt-1 text-xs text-texto-2">
        Vídeo de Juan Ramón Rallo · {enlace}
      </figcaption>
    </figure>
  );
}

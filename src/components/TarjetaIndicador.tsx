import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Indicador } from '@/lib/types';
import { Tarjeta, TituloTarjeta } from './Tarjeta';
import { Semaforo } from './Semaforo';
import { SinDato } from './SinDato';
import { AvisoStale } from './AvisoStale';
import { CitaVideo } from './CitaVideo';
import { InsigniaFuente, InsigniaPropuesto } from './InsigniaFuente';
import { Sparkline } from './Sparkline';
import { textoValor, tipoPorUnidad, type TipoFormato } from './utilidades';

/** Umbrales V/A/R del indicador, con la insignia «umbral propuesto» si procede. */
export function Umbrales({ umbrales, className }: { umbrales: Indicador['umbrales']; className?: string }) {
  if (!umbrales) return null;
  return (
    <div className={clsx('text-[11px] text-texto-2', className)}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">Umbrales:</span>
        <span>
          <span aria-hidden="true" className="text-verde">● </span>
          <span className="sr-only">Verde: </span>
          {umbrales.verde}
        </span>
        <span>
          <span aria-hidden="true" className="text-ambar">▲ </span>
          <span className="sr-only">Ámbar: </span>
          {umbrales.ambar}
        </span>
        <span>
          <span aria-hidden="true" className="text-rojo">■ </span>
          <span className="sr-only">Rojo: </span>
          {umbrales.rojo}
        </span>
        {umbrales.propuesto ? <InsigniaPropuesto /> : null}
      </p>
    </div>
  );
}

export function NotasIndicador({ notas, className }: { notas?: string[]; className?: string }) {
  if (!notas || notas.length === 0) return null;
  return (
    <ul className={clsx('space-y-0.5 text-[11px] text-texto-2', className)}>
      {notas.map((n, i) => (
        <li key={i}>· {n}</li>
      ))}
    </ul>
  );
}

/** Valor grande del indicador o «Sin dato». */
export function ValorIndicador({ ind, className, grande = false }: { ind: Indicador; className?: string; grande?: boolean }) {
  const t = textoValor(ind);
  if (t === null) return <SinDato className={className} />;
  const largo = t.length > 22;
  return (
    <p className={clsx('cifra font-semibold leading-tight', grande ? (largo ? 'text-2xl' : 'text-4xl') : largo ? 'text-base' : 'text-2xl', className)}>{t}</p>
  );
}

/**
 * Tarjeta genérica de un indicador del catálogo: nombre, valor, semáforo, umbrales, ayuda,
 * sparkline, cita del vídeo, fuente con fecha y avisos (stale, sin verificar).
 */
export function TarjetaIndicador({
  ind,
  id,
  titulo,
  className,
  children,
  sparkline = true,
  formato,
  sinValor = false,
  textoSemaforo,
}: {
  ind: Indicador | undefined;
  id: string;
  titulo?: string;
  className?: string;
  children?: ReactNode;
  sparkline?: boolean;
  formato?: TipoFormato;
  /** Oculta el valor grande (cuando el contenido propio ya lo muestra). */
  sinValor?: boolean;
  textoSemaforo?: string;
}) {
  if (!ind) {
    return (
      <Tarjeta className={className}>
        <TituloTarjeta codigo={id}>{titulo ?? id}</TituloTarjeta>
        <SinDato className="mt-2" detalle="El indicador no está en el snapshot actual." />
      </Tarjeta>
    );
  }
  const tieneSerie = sparkline && (ind.serie?.length ?? 0) > 1;
  return (
    <Tarjeta className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <TituloTarjeta codigo={ind.id} href={`/indicador/${ind.id}`}>
          {titulo ?? ind.nombre}
        </TituloTarjeta>
        <Semaforo valor={ind.semaforo} texto={textoSemaforo} etiqueta={`${ind.id}: semáforo`} tamano="sm" />
      </div>
      {!sinValor ? <ValorIndicador ind={ind} /> : null}
      {ind.stale ? <AvisoStale actualizadoEn={ind.actualizadoEn} /> : null}
      {children}
      {tieneSerie ? (
        <Sparkline
          puntos={ind.serie}
          titulo={ind.nombre}
          formato={formato ?? tipoPorUnidad(ind.unidad)}
          umbral={ind.series?.umbral}
        />
      ) : null}
      <Umbrales umbrales={ind.umbrales} />
      {ind.ayuda ? <p className="text-xs text-texto-2">{ind.ayuda}</p> : null}
      <NotasIndicador notas={ind.notas} />
      {ind.citaVideo ? <CitaVideo texto={ind.citaVideo.texto} t={ind.citaVideo.t} /> : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
        <InsigniaFuente fuente={ind.fuente} actualizadoEn={ind.actualizadoEn} />
        <Link href={`/indicador/${ind.id}`} className="no-imprimir text-[11px] text-azul-tx underline">
          Detalle<span className="sr-only"> de {ind.nombre}</span>
        </Link>
      </div>
    </Tarjeta>
  );
}

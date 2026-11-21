import clsx from 'clsx';
import Link from 'next/link';
import type { Indicador, Punto, Semaforo as TSemaforo } from '@/lib/types';
import { Tarjeta, TituloTarjeta } from './Tarjeta';
import { Semaforo } from './Semaforo';
import { SinDato } from './SinDato';
import { AvisoStale } from './AvisoStale';
import { InsigniaFuente } from './InsigniaFuente';
import { Sparkline } from './Sparkline';
import { META_SEMAFORO, type TipoFormato } from './utilidades';

export type ChipKpi = { etiqueta: string; valor: string | null; semaforo?: TSemaforo };

/** KPI: valor, variaciones, sparkline y semáforo (M1). */
export function KpiCard({
  titulo,
  codigo,
  href,
  valor,
  subvalor,
  semaforo,
  textoSemaforo,
  chips = [],
  serie,
  umbral,
  formato = 'num',
  fuente,
  actualizadoEn,
  stale,
  nota,
  className,
}: {
  titulo: string;
  codigo?: string;
  href?: string;
  valor: string | null;
  subvalor?: string | null;
  semaforo: TSemaforo;
  textoSemaforo?: string;
  chips?: ChipKpi[];
  serie?: Punto[];
  umbral?: Punto[];
  formato?: TipoFormato;
  fuente?: Indicador['fuente'];
  actualizadoEn?: string | null;
  stale?: boolean;
  nota?: string;
  className?: string;
}) {
  return (
    <Tarjeta className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <TituloTarjeta codigo={codigo} href={href}>
          {titulo}
        </TituloTarjeta>
        <Semaforo valor={semaforo} texto={textoSemaforo} etiqueta={`${titulo}: semáforo`} tamano="sm" />
      </div>
      {valor === null ? (
        <SinDato />
      ) : (
        <div>
          <p className="cifra text-3xl font-semibold leading-tight">{valor}</p>
          {subvalor ? <p className="text-xs text-texto-2">{subvalor}</p> : null}
        </div>
      )}
      {stale ? <AvisoStale actualizadoEn={actualizadoEn} /> : null}
      {chips.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const m = c.semaforo ? META_SEMAFORO[c.semaforo] : null;
            return (
              <li
                key={c.etiqueta}
                className="inline-flex items-center gap-1 rounded-md border border-borde bg-superficie-2 px-2 py-0.5 text-xs"
              >
                {m ? (
                  <span aria-hidden="true" className={m.clase}>
                    {m.icono}
                  </span>
                ) : null}
                <span className="text-texto-2">{c.etiqueta}</span>
                <span className="cifra font-semibold">{c.valor ?? 'sin dato'}</span>
                {m ? <span className="sr-only">({m.texto})</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {serie && serie.length > 1 ? <Sparkline puntos={serie} umbral={umbral} titulo={titulo} formato={formato} /> : null}
      {nota ? <p className="text-xs text-texto-2">{nota}</p> : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
        <InsigniaFuente fuente={fuente} actualizadoEn={actualizadoEn} />
        {href ? (
          <Link href={href} className="no-imprimir text-[11px] text-azul-tx underline">
            Detalle<span className="sr-only"> de {titulo}</span>
          </Link>
        ) : null}
      </div>
    </Tarjeta>
  );
}

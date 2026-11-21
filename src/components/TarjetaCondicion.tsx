import clsx from 'clsx';
import Link from 'next/link';
import type { Condicion } from '@/lib/types';
import { CONDICIONES } from '@/lib/config';
import { fecha, fechaCorta, num, pct, usd } from '@/lib/calc/formato';
import { Tarjeta, TituloTarjeta } from './Tarjeta';
import { Semaforo } from './Semaforo';
import { SinDato } from './SinDato';
import { AvisoStale } from './AvisoStale';
import { BarraProximidad } from './BarraProximidad';
import { CitaVideo } from './CitaVideo';
import { InsigniaFuente } from './InsigniaFuente';
import { Sparkline } from './Sparkline';
import { AYUDA_CONDICIONES, COLOR_BLOQUE, META_ESTADO, TITULO_CONDICION, textoValor } from './utilidades';

const U: Record<string, number> = { c1: CONDICIONES.umbralNvda, c2: CONDICIONES.umbralSoxx, c3: CONDICIONES.umbralProveedor };

/** Texto del estado con el matiz «sigue» / «recuperada». */
export function textoEstadoCondicion(c: Condicion): { corto: string; detalle: string | null } {
  const meta = META_ESTADO[c.estado] ?? META_ESTADO.sin_dato;
  let detalle: string | null = null;
  if (c.estado === 'cumplida') {
    if (c.recuperada && c.fechaSuceso) detalle = `Se cumplió el ${fechaCorta(c.fechaSuceso)} (recuperada)`;
    else detalle = 'Cumplida (sigue)';
  }
  return { corto: meta.texto, detalle };
}

/** Línea del umbral de una condición. */
export function textoUmbral(c: Condicion): string {
  if (c.id in U) {
    const u = U[c.id];
    const precio = c.precioUmbral !== null && c.precioUmbral !== undefined ? usd(c.precioUmbral) : '—';
    return c.id === 'c3' ? `${precio} (−${num(u * 100, 0)} % del máximo, el más cercano)` : `${precio} (−${num(u * 100, 0)} % del máximo)`;
  }
  if (c.id === 'c4') return `≤ ${usd(CONDICIONES.c4PrecioMax)}/h durante ${CONDICIONES.c4DiasSeguidos} días publicados seguidos`;
  if (c.id === 'c5') return 'Evento de quiebra verificado (regla A o B)';
  if (c.id === 'c6') return 'Adquisición verificada de OpenAI (regla A o B)';
  return '—';
}

export function TarjetaCondicion({ c, className }: { c: Condicion; className?: string }) {
  const bloque = COLOR_BLOQUE[c.bloque] ?? COLOR_BLOQUE.financiero;
  const meta = META_ESTADO[c.estado] ?? META_ESTADO.sin_dato;
  const { corto, detalle } = textoEstadoCondicion(c);
  const valor = textoValor(c);
  const ayuda = c.ayuda || AYUDA_CONDICIONES[c.id];
  const esPrecio = c.id === 'c1' || c.id === 'c2' || c.id === 'c3' || c.id === 'c4';
  return (
    <Tarjeta as="article" className={clsx('flex flex-col gap-2 border-t-4', bloque.borde, className)} aria-labelledby={`tc-${c.id}`} data-testid={`tarjeta-${c.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={clsx('text-[11px] font-semibold uppercase tracking-wide', bloque.texto)}>
            Condición {c.id.slice(1)} · {bloque.nombre}
          </p>
          <TituloTarjeta nivel={4} href={`/condicion/${c.id}`} className="mt-0.5 text-base">
            <span id={`tc-${c.id}`}>{TITULO_CONDICION[c.id] ?? c.nombre}</span>
          </TituloTarjeta>
        </div>
        <Semaforo valor={meta.semaforo} texto={corto} etiqueta={`Estado de la condición ${c.id.slice(1)}`} />
      </div>
      {detalle ? <p className="text-xs font-medium text-rojo-tx">{detalle}</p> : null}

      {c.estado === 'sin_dato' && valor === null ? (
        <SinDato />
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-texto-2">Valor actual</dt>
          <dd className="cifra text-right text-sm font-semibold">{valor ?? '—'}</dd>
          <dt className="text-texto-2">Umbral</dt>
          <dd className="cifra text-right">{textoUmbral(c)}</dd>
          {esPrecio && c.id !== 'c4' ? (
            <>
              <dt className="text-texto-2">Distancia restante</dt>
              <dd className="cifra text-right">
                {c.cumplidaHoy ? 'umbral superado' : c.distanciaRestante !== null && c.distanciaRestante !== undefined ? pct(c.distanciaRestante) : '—'}
              </dd>
            </>
          ) : null}
          {c.id === 'c4' && c.distanciaRestante !== null && c.distanciaRestante !== undefined ? (
            <>
              <dt className="text-texto-2">Caída que falta hasta 1 $</dt>
              <dd className="cifra text-right">{pct(c.distanciaRestante)}</dd>
            </>
          ) : null}
          <dt className="text-texto-2">Fecha del suceso</dt>
          <dd className="cifra text-right">{c.fechaSuceso ? fecha(c.fechaSuceso) : 'sin suceso'}</dd>
        </dl>
      )}

      <BarraProximidad valor={c.proximidad} semaforo={c.estado === 'sin_dato' ? 'sin_dato' : meta.semaforo} />

      {c.heredada ? (
        <p className="rounded-md bg-superficie-2 px-2 py-1 text-xs text-texto-2">
          Cumplida desde {fecha(c.cumplidaDesde ?? null)}; Polymarket y el vídeo no la cuentan como suceso nuevo.
        </p>
      ) : null}
      {c.enInvestigacion ? (
        <p className="rounded-md border border-ambar px-2 py-1 text-xs text-ambar-tx">Posible suceso en investigación (no cuenta hasta cumplir la regla A o B).</p>
      ) : null}
      {c.usaProxy ? (
        <p className="text-xs text-texto-2">Valor del proxy abierto (no oficial): no cuenta para el criterio de Polymarket.</p>
      ) : null}
      {c.stale ? <AvisoStale actualizadoEn={c.actualizadoEn} /> : null}

      {(c.serie?.length ?? 0) > 1 ? (
        <Sparkline
          puntos={c.serie}
          umbral={c.series?.umbral}
          umbralFijo={c.id === 'c4' ? CONDICIONES.c4PrecioMax : undefined}
          titulo={`${c.id.toUpperCase()} · ${c.nombre}, último año`}
          formato={c.id === 'c4' ? 'usdh' : 'usd'}
          color={bloque.color}
        />
      ) : null}

      {ayuda ? <p className="text-xs text-texto-2">{ayuda}</p> : null}
      {c.citaVideo ? <CitaVideo texto={c.citaVideo.texto} t={c.citaVideo.t} /> : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
        <InsigniaFuente fuente={c.fuente} actualizadoEn={c.actualizadoEn} />
        <Link href={`/condicion/${c.id}`} className="no-imprimir text-[11px] text-azul-tx underline">
          Ver detalle<span className="sr-only"> de la condición {c.id.slice(1)}</span>
        </Link>
      </div>
    </Tarjeta>
  );
}

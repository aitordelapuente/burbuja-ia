import clsx from 'clsx';
import type { Indicador, Punto } from '@/lib/types';
import { num, usd } from '@/lib/calc/formato';
import { GraficoXY, type SerieXY } from './GraficoXY';
import { GraficoBarras } from './GraficoBarras';
import { Tarjeta, TituloTarjeta } from './Tarjeta';
import { Semaforo } from './Semaforo';
import { SinDato } from './SinDato';
import { CitaVideo } from './CitaVideo';
import { InsigniaFuente } from './InsigniaFuente';
import { exArr, exNum, textoValor } from './utilidades';

export type DatosPuntocom = {
  fibra: Array<{ anio: number; usd_anio: number | null; dudoso?: boolean; nota?: string; t?: number }>;
  demanda: Array<{ anio: number; factor: number; acumulado: number; t?: number }>;
  texto: string;
  maximoNasdaq2000?: string;
};

const DESDE = -250;
const HASTA = 750;

/** Normaliza a 100 en el máximo y expresa X en sesiones desde el máximo. */
export function alinearEnMaximo(serie: Punto[], idxMax?: number): Array<{ x: number; y: number }> {
  if (serie.length === 0) return [];
  let im = idxMax ?? 0;
  if (idxMax === undefined) for (let i = 1; i < serie.length; i++) if (serie[i].value > serie[im].value) im = i;
  const base = serie[im].value;
  if (!base) return [];
  const out: Array<{ x: number; y: number }> = [];
  for (let i = Math.max(0, im + DESDE); i < Math.min(serie.length, im + HASTA + 1); i++) {
    out.push({ x: i - im, y: (serie[i].value / base) * 100 });
  }
  return out;
}

/** Construye las dos series de I38 a partir de lo que traiga el snapshot. */
export function seriesI38(i38: Indicador | undefined, respaldo?: Punto[]): SerieXY[] {
  const alineado = [...exArr(i38?.extra, 'puntos'), ...exArr(i38?.extra, 'alineado')];
  if (alineado.length) {
    const a: SerieXY = { id: 'y2000', nombre: 'Nasdaq 2000 (máximo del 10/03/2000)', color: 'var(--gris-tx)', puntos: [], discontinua: true };
    const b: SerieXY = { id: 'actual', nombre: 'Nasdaq actual (máximo reciente)', color: 'var(--azul)', puntos: [] };
    for (const f of alineado) {
      const x = exNum(f, 'x');
      if (x === null) continue;
      const y1 = exNum(f, 'y2000');
      const y2 = exNum(f, 'yActual') ?? exNum(f, 'actual');
      if (y1 !== null) a.puntos.push({ x, y: y1 });
      if (y2 !== null) b.puntos.push({ x, y: y2 });
    }
    return [a, b];
  }
  const entradas = Object.entries(i38?.series ?? {}).filter(([, v]) => Array.isArray(v) && v.length > 0);
  if (entradas.length >= 2) {
    return entradas.slice(0, 2).map(([k, v]) => {
      const es2000 = /2000/.test(k);
      return {
        id: es2000 ? 'y2000' : 'actual',
        nombre: es2000 ? 'Nasdaq 2000 (máximo del 10/03/2000)' : 'Nasdaq actual (máximo reciente)',
        color: es2000 ? 'var(--gris-tx)' : 'var(--azul)',
        discontinua: es2000,
        puntos: alinearEnMaximo(v),
      };
    });
  }
  const completa = (i38?.serie && i38.serie.length > 2000 ? i38.serie : respaldo) ?? [];
  if (completa.length < 2000) return [];
  // Máximo de cierre de la burbuja: el mayor cierre entre 1999 y 2001 (debe salir el 10/03/2000).
  let im2000 = -1;
  completa.forEach((p, i) => {
    if (p.date >= '1999-01-01' && p.date <= '2001-12-31' && (im2000 < 0 || p.value > completa[im2000].value)) im2000 = i;
  });
  const out: SerieXY[] = [];
  if (im2000 >= 0) out.push({ id: 'y2000', nombre: `Nasdaq 2000 (máximo del ${completa[im2000].date.split('-').reverse().join('/')})`, color: 'var(--gris-tx)', discontinua: true, puntos: alinearEnMaximo(completa, im2000) });
  out.push({ id: 'actual', nombre: 'Nasdaq actual (máximo reciente)', color: 'var(--azul)', puntos: alinearEnMaximo(completa) });
  return out;
}

/** Comparación con la burbuja puntocom (I38, I39 e I40). */
export function ComparadorPuntocom({
  i38,
  i39,
  i40,
  puntocom,
  respaldoNasdaq,
  className,
}: {
  i38?: Indicador;
  i39?: Indicador;
  i40?: Indicador;
  puntocom: DatosPuntocom;
  respaldoNasdaq?: Punto[];
  className?: string;
}) {
  const s38 = seriesI38(i38, respaldoNasdaq);
  const demandaPorAnio = new Map(puntocom.demanda.map((d) => [d.anio, d.acumulado]));
  const filasFibra = puntocom.fibra.map((f) => ({
    etiqueta: String(f.anio),
    valor: f.usd_anio,
    linea: demandaPorAnio.get(f.anio) ?? null,
    nota: f.dudoso ? (f.nota ?? 'cifra dudosa') : undefined,
  }));
  return (
    <div className={clsx('grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12', className)}>
      <Tarjeta className="col-span-1 flex flex-col gap-2 md:col-span-6 xl:col-span-7">
        <div className="flex items-start justify-between gap-2">
          <TituloTarjeta codigo="I38" href="/indicador/I38">
            Nasdaq 2000 frente a Nasdaq actual
          </TituloTarjeta>
          {i38 ? <Semaforo valor={i38.semaforo} etiqueta="I38: semáforo" tamano="sm" /> : null}
        </div>
        <p className="text-xs text-texto-2">Ambas series valen 100 en su máximo de cierre. Eje X: sesiones desde el máximo (−250 a +750).</p>
        {s38.length ? <GraficoXY titulo="Nasdaq 2000 frente a Nasdaq actual, base 100 en el máximo" series={s38} ejeX="Sesiones desde el máximo" referenciaY={{ y: 100, etiqueta: 'Máximo = 100' }} referenciaX={{ x: 0, etiqueta: 'Máximo' }} /> : <SinDato />}
        <p className="text-xs text-texto-2">{i38?.ayuda || 'El Nasdaq empezó a hundirse en marzo de 2000; el precio de la fibra se desplomó después.'}</p>
        {i38?.citaVideo ? <CitaVideo texto={i38.citaVideo.texto} t={i38.citaVideo.t} /> : <CitaVideo t={1268} texto="Puntocom: el Nasdaq se hunde desde marzo de 2000; la fibra cae después" />}
        {i38 ? <InsigniaFuente fuente={i38.fuente} actualizadoEn={i38.actualizadoEn} /> : null}
      </Tarjeta>

      <Tarjeta className="col-span-1 flex flex-col gap-2 md:col-span-6 xl:col-span-5">
        <TituloTarjeta codigo="I39" href="/indicador/I39">
          Fibra: precio frente a demanda (2000-2002)
        </TituloTarjeta>
        <GraficoBarras
          titulo="Precio anual de un enlace Los Ángeles–Nueva York (escala logarítmica) y demanda de ancho de banda submarino acumulada"
          filas={filasFibra}
          nombre="Precio enlace LA–NY ($/año)"
          formato="usd"
          nombreLinea="Demanda acumulada (×)"
          formatoLinea="num"
          log
          color="var(--azul)"
        />
        <ul className="space-y-0.5 text-xs text-texto-2">
          {puntocom.fibra.map((f) => (
            <li key={f.anio}>
              {f.anio}: <span className="cifra">{f.usd_anio === null ? 'sin dato' : usd(f.usd_anio, 0)}</span>
              {f.dudoso ? <span className="text-ambar-tx"> · dudoso: {f.nota}</span> : null}
            </li>
          ))}
          {puntocom.demanda.map((d) => (
            <li key={`d${d.anio}`}>
              Demanda {d.anio}: ×{num(d.factor, 0)} (acumulado ×{num(d.acumulado, 0)})
            </li>
          ))}
        </ul>
        <p className="text-sm">{puntocom.texto}</p>
        <CitaVideo t={1279} texto="Enlace LA–NY: 1,8 M$, 590.000 $ y «4.000 $»" />
        {i39 ? <InsigniaFuente fuente={i39.fuente} actualizadoEn={i39.actualizadoEn} /> : <p className="text-[11px] text-texto-2">Fuente: datos estáticos del vídeo (data/seed/puntocom.json).</p>}
      </Tarjeta>

      <Tarjeta className="col-span-1 flex flex-col gap-2 md:col-span-6 xl:col-span-12">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <TituloTarjeta codigo="I40" href="/indicador/I40">
            Análogo actual: el alquiler de la H100 como «precio de la fibra»
          </TituloTarjeta>
          {i40 ? <Semaforo valor={i40.semaforo} etiqueta="I40: semáforo" /> : null}
        </div>
        {i40 ? (
          <>
            <p className="text-lg font-semibold">{textoValor(i40) ?? i40.nombre}</p>
            {i40.ayuda ? <p className="text-xs text-texto-2">{i40.ayuda}</p> : null}
            <p className="text-xs text-texto-2">Regla: si SDH100RT cae más de un 50 % en 12 meses → «Patrón puntocom en marcha»; si no, «Sin patrón puntocom en el precio del cómputo».</p>
            <InsigniaFuente fuente={i40.fuente} actualizadoEn={i40.actualizadoEn} />
          </>
        ) : (
          <SinDato />
        )}
      </Tarjeta>
    </div>
  );
}

import { fecha, num, pct, usd } from '@/lib/calc/formato';
import { CONDICIONES } from '@/lib/config';
import { Modulo, Rejilla, COLS } from '../Tarjeta';
import { TarjetaIndicador } from '../TarjetaIndicador';
import { GraficoSerie, type SerieGrafico } from '../GraficoSerie';
import { GraficoBarras } from '../GraficoBarras';
import { InsigniaSinVerificar } from '../InsigniaFuente';
import { SinDato } from '../SinDato';
import { RANGOS_PORTADA, exArr, exBool, exNum, exStr, recortar } from '../utilidades';
import { ind, type PropsModulo } from './comun';

/** M7 · Economía real: alquiler de GPU (#computo). */
export default function M7({ s }: PropsModulo) {
  const i24 = ind(s, 'I24');
  const i24b = ind(s, 'I24b');
  const i25 = ind(s, 'I25');
  const i26 = ind(s, 'I26');
  const series: SerieGrafico[] = [];
  if (i24?.serie?.length) series.push({ id: 'sd', nombre: 'H100 · Silicon Data SDH100RT', puntos: recortar(i24.serie), color: 'var(--violeta)' });
  if (i24b?.serie?.length) series.push({ id: 'iaa', nombre: 'Proxy abierto (no oficial) · neoclouds', puntos: i24b.serie, color: 'var(--azul)', discontinua: true });
  const hs = i24b?.series?.hiperescaladores;
  if (hs?.length) series.push({ id: 'hs', nombre: 'Proxy abierto (no oficial) · hiperescaladores', puntos: hs, color: 'var(--gris-tx)', discontinua: true });
  const chips: Array<[string, number | null]> = [
    ['30 días', exNum(i24?.extra, 'd30')],
    ['90 días', exNum(i24?.extra, 'd90')],
    ['desde dic. 2025', exNum(i24?.extra, 'dDic')],
  ];
  const racha = exNum(i24?.extra, 'racha');
  const puntosVideo = exArr(i24?.extra, 'puntosVideo');
  const barras = exArr(i26?.extra, 'barras').map((b) => ({
    etiqueta: exStr(b, 'gpu') ?? '?',
    valor: exNum(b, 'usd'),
    nota: exBool(b, 'verificado') === false ? 'dato del vídeo, sin verificar' : undefined,
    color: /proxy/i.test(exStr(b, 'gpu') ?? '') ? 'var(--azul)' : 'var(--violeta)',
  }));
  return (
    <Modulo id="computo" codigo="M7" titulo="Economía real: alquiler de GPU" subtitulo="Lo que se paga hora a hora por usar los chips. Si sobrara capacidad, sería el primer precio en hundirse.">
      <Rejilla>
        <TarjetaIndicador className={COLS[8]} id="I24" ind={i24} sparkline={false}>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {chips.map(([e, v]) => (
              <li key={e} className="rounded-md border border-borde bg-superficie-2 px-2 py-0.5">
                <span className="text-texto-2">{e}: </span>
                <span className="cifra font-semibold">{v === null ? 'sin dato' : pct(v, 1, true)}</span>
              </li>
            ))}
            <li className="rounded-md border border-borde bg-superficie-2 px-2 py-0.5">
              <span className="text-texto-2">Días seguidos ≤ 1 $: </span>
              <span className="cifra font-semibold">{racha === null ? 'sin dato' : `${num(racha, 0)}/${CONDICIONES.c4DiasSeguidos}`}</span>
            </li>
          </ul>
          {series.length ? (
            <GraficoSerie
              titulo="Precio por hora de la H100"
              series={series}
              referencias={[{ y: CONDICIONES.c4PrecioMax, etiqueta: 'Umbral de Polymarket: 1 $/h' }]}
              banda={{ y1: 0, y2: CONDICIONES.c4PrecioMax, etiqueta: 'Zona ≤ 1 $/h' }}
              formato="usdh"
              rangoInicial="1A"
              rangos={RANGOS_PORTADA}
              dominioY={[0, 'auto']}
            />
          ) : (
            <SinDato />
          )}
          {puntosVideo.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-2">Cifras citadas en el vídeo</p>
              <ul className="mt-1 space-y-1 text-xs">
                {puntosVideo.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <span className="cifra">{fecha(exStr(p, 'fecha'))}</span>
                    <span className="cifra font-semibold">{exNum(p, 'usd_hora') === null ? 'sin dato' : `${usd(exNum(p, 'usd_hora'))}/h`}</span>
                    <span className="text-texto-2">{exStr(p, 'fuente')}</span>
                    {exBool(p, 'verificado') === false ? <InsigniaSinVerificar /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {i24b ? <p className="text-xs text-texto-2">El proxy abierto (RunPod, Vast.ai, Azure y AWS) usa otra metodología y no cuenta para el criterio de Polymarket.</p> : null}
        </TarjetaIndicador>
        <div className={`${COLS[4]} flex flex-col gap-4`}>
          <TarjetaIndicador id="I24b" ind={i24b} sparkline={false} />
          <TarjetaIndicador id="I25" ind={i25} sparkline={false} />
        </div>
        <TarjetaIndicador className={COLS[12]} id="I26" ind={i26} sinValor sparkline={false}>
          {barras.length ? <GraficoBarras titulo="Precio por hora por generación de GPU" filas={barras} nombre="$/h" formato="usdh" color="var(--violeta)" /> : <SinDato />}
        </TarjetaIndicador>
      </Rejilla>
    </Modulo>
  );
}

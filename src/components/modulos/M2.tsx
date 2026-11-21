import { AlertTriangle, ExternalLink } from 'lucide-react';
import { POLYMARKET } from '@/lib/config';
import { fecha, num } from '@/lib/calc/formato';
import { Modulo, Rejilla, COLS, Tarjeta, TituloTarjeta } from '../Tarjeta';
import { Gauge } from '../GaugeIRP';
import { GraficoSerie } from '../GraficoSerie';
import { SinDato } from '../SinDato';
import { Semaforo } from '../Semaforo';
import { CitaVideo } from '../CitaVideo';
import { InsigniaFuente } from '../InsigniaFuente';
import { AvisoStale } from '../AvisoStale';
import { REGLAMENTO_ES } from '../reglamento';
import { exArr, exBool, exNum, exStr, usdVolumen } from '../utilidades';
import { semaforoProb } from './M0';
import { ind, type PropsModulo } from './comun';

/** M2 · Probabilidad de mercado (#polymarket). */
export default function M2({ s }: PropsModulo) {
  const pm = s.polymarket;
  const i04 = ind(s, 'I04');
  const i06 = ind(s, 'I06');
  const principal = pm.horizontes.find((h) => h.slug === pm.principal) ?? pm.horizontes[0];
  const sinMercado = exBool(i04?.extra, 'sinMercado') === true || !principal;
  const saltos = exArr(i04?.extra, 'saltos')
    .map((x) => ({ date: exStr(x, 'date') ?? '', pp: exNum(x, 'pp') }))
    .filter((x) => x.date && x.pp !== null && Math.abs(x.pp) >= POLYMARKET.saltoAnotacionPp);
  const serie = i04?.serie?.length ? i04.serie : (principal?.serie ?? []);
  const reglamento = pm.reglamento ?? exStr(i06?.extra, 'descripcion');
  return (
    <Modulo
      id="polymarket"
      codigo="M2"
      titulo="Probabilidad de mercado"
      subtitulo="Precio del «Sí» en Polymarket para el mercado «AI bubble burst», por horizonte."
    >
      <Rejilla>
        <Tarjeta className={`${COLS[4]} flex flex-col gap-3`}>
          <TituloTarjeta codigo="I04" href="/indicador/I04">
            {principal ? `Pinchazo antes del ${fecha(principal.fin)}` : 'Mercado principal'}
          </TituloTarjeta>
          {sinMercado ? (
            <p className="text-sm font-semibold">Sin mercado activo</p>
          ) : (
            <Gauge
              valor={principal.probSi === null ? null : principal.probSi * 100}
              semaforo={semaforoProb(principal.probSi)}
              etiqueta={`Probabilidad del «Sí»: ${principal.titulo}`}
              textoValor={principal.probSi === null ? '—' : num(principal.probSi * 100, 1)}
              unidad=" %"
              textoEstado={principal.probSi === null ? 'Sin dato' : `${num(principal.probSi * 100, 1)} %`}
              bandas={[
                { desde: 0, hasta: 20, semaforo: 'verde' },
                { desde: 20, hasta: 50, semaforo: 'ambar' },
                { desde: 50, hasta: 100, semaforo: 'rojo' },
              ]}
            />
          )}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-texto-2">Horizontes</p>
            {pm.horizontes.length === 0 ? (
              <SinDato />
            ) : (
              <ul className="space-y-1 text-sm">
                {pm.horizontes.map((h) => (
                  <li key={h.slug} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {h.titulo}
                      <span className="block text-[11px] text-texto-2">
                        Cierre {fecha(h.fin)}
                        {h.volumen !== null ? ` · volumen ${usdVolumen(h.volumen)}` : ''}
                      </span>
                    </span>
                    <Semaforo
                      valor={semaforoProb(h.probSi)}
                      texto={h.probSi === null ? 'Sin dato' : `${num(h.probSi * 100, 1)} %`}
                      etiqueta={`Probabilidad: ${h.titulo}`}
                      tamano="sm"
                    />
                  </li>
                ))}
              </ul>
            )}
            {pm.resueltos.length ? (
              <ul className="mt-2 space-y-0.5 text-xs text-texto-2">
                {pm.resueltos.map((r) => (
                  <li key={r.slug}>
                    {r.titulo} ({fecha(r.fin)}): <strong className="text-texto">Resuelto: {r.resultado ?? '—'}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {i04?.umbrales?.propuesto ? <p className="text-[11px] text-texto-2">Verde &lt; 20 % y ámbar 20–50 % son umbrales propuestos; ≥ 50 % es la señal de alarma del vídeo.</p> : null}
        </Tarjeta>

        <Tarjeta className={`${COLS[8]} flex flex-col gap-2`}>
          <TituloTarjeta>Histórico de la probabilidad (90 días)</TituloTarjeta>
          {i04?.stale ? <AvisoStale actualizadoEn={i04.actualizadoEn} /> : null}
          {serie.length > 1 ? (
            <GraficoSerie
              titulo="Probabilidad del «Sí» en Polymarket"
              series={[{ id: 'p', nombre: 'Probabilidad «Sí»', puntos: serie, color: 'var(--azul)' }]}
              referencias={[{ y: POLYMARKET.umbrales.rojo, etiqueta: '50 %' }]}
              anotaciones={saltos.map((x) => ({ date: x.date, texto: `${x.pp! > 0 ? '+' : ''}${num(x.pp, 0)} pp en un día` }))}
              formato="prob"
              rangoInicial="3M"
              conRangos={false}
              dominioY={[0, 1]}
            />
          ) : (
            <SinDato />
          )}
          {saltos.length ? (
            <ul className="text-xs text-texto-2">
              {saltos.map((x) => (
                <li key={x.date}>
                  {fecha(x.date)}: <span className="cifra font-semibold text-texto">{x.pp! > 0 ? '+' : ''}{num(x.pp, 0)} pp</span> en un día
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-texto-2">
            {i04?.ayuda ||
              'Polymarket es un mercado de predicciones: el contrato "Sí" paga 1 $ si ocurre el suceso. Si cotiza a 0,55 $, el mercado asigna un 55 % de probabilidad.'}
          </p>
          <CitaVideo t={i04?.citaVideo?.t ?? 92} texto={i04?.citaVideo?.texto ?? 'Funcionamiento del contrato: paga 1 $; 55 ¢ = 55 %'} />
          <div className="flex flex-wrap items-end justify-between gap-2">
            {i04 ? <InsigniaFuente fuente={i04.fuente} actualizadoEn={i04.actualizadoEn} /> : null}
            <a href={POLYMARKET.web} target="_blank" rel="noopener noreferrer" className="enlace inline-flex items-center gap-1 text-xs">
              Ver en Polymarket <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          </div>
        </Tarjeta>

        <Tarjeta className={`${COLS[12]} flex flex-col gap-2`}>
          <TituloTarjeta codigo="I06" href="/indicador/I06">
            Reglamento del mercado
          </TituloTarjeta>
          {pm.reglasCambiadas ? (
            <p role="alert" className="flex items-center gap-2 rounded-md border border-rojo px-3 py-2 text-sm font-semibold text-rojo-tx">
              <AlertTriangle aria-hidden="true" className="h-4 w-4" />
              Polymarket ha cambiado el reglamento; revisa la lógica
            </p>
          ) : null}
          <div className="grid items-start gap-3 md:grid-cols-2">
            <details className="rounded-md border border-borde bg-superficie-2 p-3">
              <summary className="cursor-pointer text-sm font-medium">Reglamento original (inglés)</summary>
              {reglamento ? (
                <p lang="en" className="mt-2 whitespace-pre-line text-xs text-texto-2">
                  {reglamento}
                </p>
              ) : (
                <SinDato className="mt-2" />
              )}
            </details>
            <details className="rounded-md border border-borde bg-superficie-2 p-3" open>
              <summary className="cursor-pointer text-sm font-medium">Traducción</summary>
              <p className="mt-2 text-xs">{REGLAMENTO_ES.intro}</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
                {Object.values(REGLAMENTO_ES.condiciones).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
              <p className="mt-1 text-[11px] text-texto-2">{REGLAMENTO_ES.nota}</p>
            </details>
          </div>
          <CitaVideo t={138} texto="Hace falta una parametrización sin ambigüedad" />
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

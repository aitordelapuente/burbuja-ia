import { fecha, musd, usd } from '@/lib/calc/formato';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { Modulo, Rejilla, COLS, Tarjeta, TituloTarjeta } from '../Tarjeta';
import { TarjetaIndicador } from '../TarjetaIndicador';
import { GraficoSerie } from '../GraficoSerie';
import { GraficoBarras } from '../GraficoBarras';
import { RegistroEventos, aEventos } from '../RegistroEventos';
import { Semaforo } from '../Semaforo';
import { InsigniaSinVerificar } from '../InsigniaFuente';
import { CitaVideo } from '../CitaVideo';
import { SinDato } from '../SinDato';
import { esRegistro, exArr, exBool, exNum, exStr, segundoDeUrl } from '../utilidades';
import { cond, ind, type PropsModulo } from './comun';

const ESTADO_LAB: Record<string, { s: TSemaforo; t: string }> = {
  normal: { s: 'verde', t: 'Normal' },
  tension: { s: 'ambar', t: 'Tensión' },
  evento: { s: 'rojo', t: 'Evento' },
};

/** M8 · Laboratorios (OpenAI, Anthropic) (#laboratorios). */
export default function M8({ s }: PropsModulo) {
  const i27 = ind(s, 'I27');
  const i28 = ind(s, 'I28');
  const i29 = ind(s, 'I29');
  const labs = exArr(i27?.extra, 'labs');
  const eventos = [...exArr(cond(s, 'c5')?.extra, 'eventos'), ...exArr(cond(s, 'c6')?.extra, 'eventos')];
  const items29 = exArr(i29?.extra, 'items');
  const porAnio = esRegistro(i29?.extra) && esRegistro(i29.extra.porAnio) ? i29.extra.porAnio : {};
  const barras = Object.entries(porAnio).flatMap(([anio, v]) =>
    esRegistro(v)
      ? Object.entries(v).map(([lab, imp]) => ({ etiqueta: `${lab} ${anio}`, valor: typeof imp === 'number' ? imp : null, color: lab === 'Anthropic' ? 'var(--violeta)' : 'var(--azul)' }))
      : [],
  );
  const opv = exNum(i28?.extra, 'opv');
  return (
    <Modulo id="laboratorios" codigo="M8" titulo="Laboratorios (OpenAI, Anthropic)" subtitulo="Los laboratorios alquilan casi toda la capacidad de cómputo.">
      <Rejilla>
        <TarjetaIndicador className={COLS[6]} id="I27" ind={i27} sinValor sparkline={false}>
          {labs.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {labs.map((l, i) => {
                const e = ESTADO_LAB[exStr(l, 'estado') ?? ''] ?? { s: 'sin_dato' as TSemaforo, t: 'Sin dato' };
                return (
                  <li key={i} className="rounded-md border border-borde bg-superficie-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{exStr(l, 'lab')}</p>
                      <Semaforo valor={e.s} texto={e.t} etiqueta={`Estado de ${exStr(l, 'lab')}`} tamano="sm" />
                    </div>
                    <p className="mt-1 text-xs text-texto-2">{exStr(l, 'nota')}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-texto-2">
                      <span className="cifra">{fecha(exStr(l, 'fecha'))}</span>
                      {exBool(l, 'verificado') === false ? <InsigniaSinVerificar /> : null}
                      {segundoDeUrl(exStr(l, 'fuente_url')) !== null ? <CitaVideo t={segundoDeUrl(exStr(l, 'fuente_url'))!} compacta /> : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <SinDato />
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-2">Eventos de quiebra o adquisición (c5, c6)</p>
            <RegistroEventos eventos={aEventos(eventos)} vacio="Sin eventos verificados ni en investigación." className="mt-1" />
          </div>
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I28" ind={i28} sparkline={false}>
          {i28?.serie?.length ? (
            <GraficoSerie
              titulo="Cotización de Anthropic (ANT)"
              series={[{ id: 'ant', nombre: 'ANT', puntos: i28.serie, color: 'var(--violeta)' }]}
              referencias={opv !== null ? [{ y: opv, etiqueta: `Precio de la OPV: ${usd(opv)}`, color: 'var(--borde-fuerte)' }] : []}
              formato="usd"
              conRangos={false}
              rangoInicial="Máx"
            />
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[12]} id="I29" ind={i29} sparkline={false}>
          <div className="grid gap-4 md:grid-cols-2">
            {barras.length ? <GraficoBarras titulo="Financiación captada por laboratorio y año (M$)" filas={barras} nombre="Importe (M$)" formato="musd" /> : <SinDato />}
            <ul className="space-y-2 text-sm">
              {items29.map((it, i) => (
                <li key={i} className="border-l-2 border-borde-fuerte pl-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{exStr(it, 'lab')}</span>
                    <span className="rounded border border-borde px-1.5 text-[11px] text-texto-2">{exStr(it, 'tipo')}</span>
                    <span className="cifra">{exNum(it, 'importe_musd') === null ? 'cifra no disponible' : musd(exNum(it, 'importe_musd'))}</span>
                    {exBool(it, 'verificado') === false ? <InsigniaSinVerificar /> : null}
                  </p>
                  <p className="text-xs text-texto-2">{exStr(it, 'nota')}</p>
                  {segundoDeUrl(exStr(it, 'fuente_url')) !== null ? <CitaVideo t={segundoDeUrl(exStr(it, 'fuente_url'))!} compacta /> : null}
                </li>
              ))}
            </ul>
          </div>
        </TarjetaIndicador>
        <Tarjeta className={COLS[12]}>
          <TituloTarjeta>Fragilidades de fondo</TituloTarjeta>
          <p className="mt-1 text-sm text-texto-2">
            El vídeo señala fragilidades en las arquitecturas financieras de los laboratorios: buena parte de la demanda de chips la pagan empresas que pierden dinero y dependen de financiación.
          </p>
          <CitaVideo className="mt-2" t={1054} texto="Fragilidades en sus arquitecturas financieras" />
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

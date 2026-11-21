import { UMBRALES } from '@/lib/config';
import { Modulo, Rejilla, COLS } from '../Tarjeta';
import { TarjetaIndicador } from '../TarjetaIndicador';
import { GraficoSerie } from '../GraficoSerie';
import { RegistroEventos, aEventos } from '../RegistroEventos';
import { SinDato } from '../SinDato';
import { RANGOS_PORTADA, esRegistro, exArr, recortar, soloCambios } from '../utilidades';
import { ind, type PropsModulo } from './comun';

const AMBITO: Record<string, string> = { EEUU: 'EE. UU.', UE: 'UE', otro: 'Otro' };

/** M9 · Condiciones financieras y políticas (#financiacion). */
export default function M9({ s }: PropsModulo) {
  const i30 = ind(s, 'I30');
  const i31 = ind(s, 'I31');
  const i32 = ind(s, 'I32');
  const i33 = ind(s, 'I33');
  const i34 = ind(s, 'I34');
  return (
    <Modulo id="financiacion" codigo="M9" titulo="Condiciones financieras y políticas" subtitulo="Los motores del escenario 1 y la vía de contagio del escenario 2.">
      <Rejilla>
        <TarjetaIndicador className={COLS[4]} id="I30" ind={i30} sparkline={false}>
          {i30?.serie?.length ? (
            <GraficoSerie
              titulo="Rentabilidad del bono a 10 años de EE. UU."
              series={[{ id: 'dgs10', nombre: 'DGS10', puntos: recortar(i30.serie), color: 'var(--azul)' }]}
              rangos={RANGOS_PORTADA}
              referencias={[
                { y: UMBRALES.I30.ambar, etiqueta: '4,25 %', color: 'var(--ambar)' },
                { y: UMBRALES.I30.rojo, etiqueta: '4,75 %', color: 'var(--rojo)' },
              ]}
              formato="tasa"
            />
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[4]} id="I31" ind={i31} sparkline={false}>
          {i31?.serie?.length ? (
            <GraficoSerie titulo="Tipo objetivo de la Fed (límite superior)" series={[{ id: 'fed', nombre: 'DFEDTARU', puntos: soloCambios(recortar(i31.serie)), color: 'var(--azul)', escalonada: true }]} formato="tasa" rangos={RANGOS_PORTADA} />
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[4]} id="I32" ind={i32} sparkline={false}>
          {i32?.serie?.length ? <GraficoSerie titulo="Renaissance IPO ETF (proxy de la ventana de OPV)" series={[{ id: 'ipo', nombre: 'IPO', puntos: recortar(i32.serie), color: 'var(--azul)' }]} formato="usd" rangos={RANGOS_PORTADA} /> : <SinDato />}
          {exArr(i32?.extra, 'opv').length ? (
            <RegistroEventos
              eventos={aEventos(
                exArr(i32?.extra, 'opv').map((o) => ({ ...o, titulo: `OPV de ${String(o.empresa ?? '')} (${String(o.ticker ?? '')}) a ${String(o.precio_opv ?? '—')} $` })),
              )}
            />
          ) : null}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I33" ind={i33} sparkline={false}>
          <RegistroEventos eventos={aEventos(exArr(i33?.extra, 'eventos'))} vacio="Sin eventos del frente de financiación." />
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I34" ind={i34} sparkline={false}>
          <RegistroEventos
            eventos={aEventos(exArr(i34?.extra, 'items'), (r) => (esRegistro(r) && typeof r.ambito === 'string' ? (AMBITO[r.ambito] ?? r.ambito) : null))}
            vacio="Sin eventos regulatorios en los últimos 180 días."
          />
        </TarjetaIndicador>
      </Rejilla>
    </Modulo>
  );
}

import { pct, usd } from '@/lib/calc/formato';
import { Modulo, Rejilla, COLS } from '../Tarjeta';
import { TarjetaIndicador } from '../TarjetaIndicador';
import { GraficoSerie } from '../GraficoSerie';
import { SinDato } from '../SinDato';
import { RANGOS_PORTADA, exArr, exNum, exStr, recortar } from '../utilidades';
import { ind, type PropsModulo } from './comun';

const COLORES: Record<string, string> = { SOXX: 'var(--azul)', NVDA: 'var(--violeta)', Global: 'var(--ambar)' };

/** M5 · Sector de semiconductores (#semis). */
export default function M5({ s }: PropsModulo) {
  const i19 = ind(s, 'I19');
  const i20 = ind(s, 'I20');
  const i21 = ind(s, 'I21');
  const i22 = ind(s, 'I22');
  const series19 = Object.entries(i19?.series ?? {}).map(([k, v]) => ({ id: k, nombre: k, puntos: recortar(v), color: COLORES[k] ?? 'var(--texto-2)' }));
  const series21 = Object.entries(i21?.series ?? {}).map(([k, v]) => ({
    id: k,
    nombre: k === 'Global' ? 'ETF global (SEMI.L)' : k,
    puntos: recortar(v),
    color: COLORES[k] ?? 'var(--texto-2)',
  }));
  const anterior = exStr(i20?.extra, 'anteriorFecha');
  const componentes = exArr(i22?.extra, 'componentes');
  return (
    <Modulo id="semis" codigo="M5" titulo="Sector de semiconductores" subtitulo="¿Es cosa de Nvidia o de todo el sector?">
      <Rejilla>
        <TarjetaIndicador className={COLS[6]} id="I19" ind={i19} sparkline={false}>
          {series19.length ? (
            <GraficoSerie titulo="SOXX frente a NVDA, base 100 en el máximo del SOXX" series={series19} referencias={[{ y: 100, etiqueta: 'Máximo del SOXX = 100', color: 'var(--borde-fuerte)' }]} formato="num" rangoInicial="1A" rangos={RANGOS_PORTADA} />
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I20" ind={i20} sparkline={false}>
          {i20?.serie?.length ? (
            <GraficoSerie
              titulo="Variación en 42 sesiones del índice ^SOX desde 1994"
              series={[{ id: 'r42', nombre: 'r42 (^SOX)', puntos: i20.serie.filter((_, i, a) => (a.length - 1 - i) % 10 === 0), color: 'var(--azul)' }]}
              referencias={[{ y: -0.3, etiqueta: '−30 %' }]}
              anotaciones={[
                { date: '2001-09-21', texto: '2001' },
                { date: '2008-11-20', texto: '2008' },
                ...(anterior && !anterior.startsWith('2001-09') ? [{ date: anterior, texto: 'último inferior' }] : []),
              ]}
              formato="pct"
              rangoInicial="Máx"
              conRangos={false}
            />
          ) : null}
          {i20?.serie?.length ? (
            <p className="text-[11px] text-texto-2">Serie semanal (un dato de cada diez sesiones). La diaria completa está en el detalle.</p>
          ) : (
            <SinDato />
          )}
          {exNum(i20?.extra, 'r42Soxx') !== null ? (
            <p className="text-xs text-texto-2">
              SOXX en 42 sesiones: <span className="cifra text-texto">{pct(exNum(i20?.extra, 'r42Soxx'))}</span>
              {i20?.extra?.coincideVideo === false ? ' (el vídeo dice septiembre de 2001)' : ''}
            </p>
          ) : null}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I21" ind={i21} sparkline={false}>
          {series21.length ? <GraficoSerie titulo="ETF global de semiconductores frente al SOXX, base 100" series={series21} formato="num" rangos={RANGOS_PORTADA} /> : <SinDato />}
          {exStr(i21?.extra, 'isin') ? <p className="text-[11px] text-texto-2">ISIN {exStr(i21?.extra, 'isin')} · sin enlaces comerciales.</p> : null}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I22" ind={i22} sinValor sparkline={false}>
          {componentes.length ? (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable">
              <table className="tabla">
                <caption className="sr-only">Componentes del SOXX citados en el vídeo y su caída desde el máximo</caption>
                <thead>
                  <tr>
                    <th scope="col">Empresa</th>
                    <th scope="col">Papel</th>
                    <th scope="col" className="num">Cierre</th>
                    <th scope="col" className="num">Desde máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {componentes.map((c) => (
                    <tr key={String(c.ticker)}>
                      <th scope="row" className="font-medium">
                        {String(c.nombre ?? c.ticker)} <span className="cifra text-[11px] font-normal text-texto-2">{String(c.ticker)}</span>
                      </th>
                      <td>{String(c.papel ?? '')}</td>
                      <td className="num">{usd(exNum(c, 'close'))}</td>
                      <td className="num">{pct(exNum(c, 'dd'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
      </Rejilla>
    </Modulo>
  );
}

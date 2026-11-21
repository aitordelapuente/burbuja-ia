import { pct } from '@/lib/calc/formato';
import { KpiCard } from '../KpiCard';
import { Modulo, Rejilla, COLS } from '../Tarjeta';
import { META_ESTADO, exNum, exSemaforo, exStr, textoValor, variacionN } from '../utilidades';
import { cond, ind, type PropsModulo } from './comun';

/** M1 · Termómetro del mercado (#termometro). */
export default function M1({ s }: PropsModulo) {
  const i01 = ind(s, 'I01');
  const i02 = ind(s, 'I02');
  const i03 = ind(s, 'I03');
  const i19 = ind(s, 'I19');
  const c1 = cond(s, 'c1');
  const c2 = cond(s, 'c2');
  const d1Nas = exNum(i02?.extra, 'd1') ?? exNum(i01?.extra, 'd1');
  const d5Nas = exNum(i02?.extra, 'd5') ?? exNum(i01?.extra, 'd5');
  const d1Nv = exNum(i03?.extra, 'd1') ?? variacionN(c1?.serie, 1);
  const d5Nv = exNum(i03?.extra, 'd5') ?? variacionN(c1?.serie, 5);
  const d1Sx = exNum(i19?.extra, 'soxxD1') ?? variacionN(c2?.serie, 1);
  const d5Sx = exNum(i19?.extra, 'soxxD5') ?? variacionN(c2?.serie, 5);
  const capSemana = exStr(i03?.extra, 'capPerdidaSemanaTexto');
  const capAth = exStr(i03?.extra, 'capPerdidaDesdeATHTexto');
  return (
    <Modulo id="termometro" codigo="M1" titulo="Termómetro del mercado" subtitulo="Variación diaria, semanal y desde máximos del Nasdaq, Nvidia y el SOXX.">
      <Rejilla>
        <KpiCard
          className={COLS[4]}
          codigo="I01"
          titulo="Nasdaq Composite"
          href="/indicador/I01"
          valor={i01 ? textoValor(i01) : null}
          subvalor="caída desde el máximo de cierre"
          semaforo={i01?.semaforo ?? 'sin_dato'}
          chips={[
            { etiqueta: '1 día', valor: d1Nas === null ? null : pct(d1Nas, 1, true), semaforo: exSemaforo(i02?.extra, 'semaforoD1') ?? undefined },
            { etiqueta: '5 días', valor: d5Nas === null ? null : pct(d5Nas, 1, true), semaforo: exSemaforo(i02?.extra, 'semaforoD5') ?? undefined },
          ]}
          serie={i01?.serie}
          formato="num"
          fuente={i01?.fuente}
          actualizadoEn={i01?.actualizadoEn}
          stale={i01?.stale}
          nota={i01?.ayuda}
        />
        <KpiCard
          className={COLS[4]}
          codigo="I03"
          titulo="Nvidia (NVDA)"
          href="/indicador/I03"
          valor={c1 ? textoValor(c1) : null}
          subvalor={exNum(c1?.extra, 'dd') !== null ? `${pct(exNum(c1?.extra, 'dd'))} desde su máximo` : undefined}
          semaforo={i03?.semaforo ?? 'sin_dato'}
          textoSemaforo={c1 ? META_ESTADO[c1.estado]?.texto : undefined}
          chips={[
            { etiqueta: '1 día', valor: d1Nv === null ? null : pct(d1Nv, 1, true) },
            { etiqueta: '5 días', valor: d5Nv === null ? null : pct(d5Nv, 1, true), semaforo: i03?.semaforo },
            ...(capSemana ? [{ etiqueta: 'Cap. perdida en la semana', valor: capSemana }] : []),
            ...(capAth ? [{ etiqueta: 'Desde máximos', valor: capAth }] : []),
          ]}
          serie={c1?.serie}
          umbral={c1?.series?.umbral}
          formato="usd"
          fuente={i03?.fuente ?? c1?.fuente}
          actualizadoEn={i03?.actualizadoEn ?? c1?.actualizadoEn}
          stale={i03?.stale || c1?.stale}
          nota={i03?.ayuda}
        />
        <KpiCard
          className={COLS[4]}
          codigo="c2"
          titulo="Semiconductores (SOXX)"
          href="/condicion/c2"
          valor={c2 ? textoValor(c2) : null}
          subvalor={
            (exNum(i19?.extra, 'ddSoxx') ?? exNum(c2?.extra, 'dd')) !== null
              ? `${pct(exNum(i19?.extra, 'ddSoxx') ?? exNum(c2?.extra, 'dd'))} desde su máximo`
              : undefined
          }
          semaforo={c2 ? META_ESTADO[c2.estado].semaforo : 'sin_dato'}
          textoSemaforo={c2 ? META_ESTADO[c2.estado].texto : undefined}
          chips={[
            { etiqueta: '1 día', valor: d1Sx === null ? null : pct(d1Sx, 1, true) },
            { etiqueta: '5 días', valor: d5Sx === null ? null : pct(d5Sx, 1, true) },
          ]}
          serie={c2?.serie}
          umbral={c2?.series?.umbral}
          formato="usd"
          fuente={c2?.fuente}
          actualizadoEn={c2?.actualizadoEn}
          stale={c2?.stale}
          nota="SOXX (iShares Semiconductor ETF) es el «Sox» del vídeo (D3)."
        />
      </Rejilla>
    </Modulo>
  );
}

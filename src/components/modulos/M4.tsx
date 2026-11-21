import { musd, num, pct } from '@/lib/calc/formato';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { Modulo, Rejilla, COLS, Tarjeta, TituloTarjeta } from '../Tarjeta';
import { TarjetaIndicador } from '../TarjetaIndicador';
import { GraficoBarras } from '../GraficoBarras';
import { RegistroEventos, aEventos } from '../RegistroEventos';
import { Semaforo } from '../Semaforo';
import { SinDato } from '../SinDato';
import { META_SEMAFORO, esRegistro, exArr, exNum, exSemaforo, exStr } from '../utilidades';
import { ind, type PropsModulo } from './comun';

const FRENTES: Array<{ id: string; nombre: string }> = [
  { id: 'direccion', nombre: 'Dirección' },
  { id: 'regulacion', nombre: 'Regulación' },
  { id: 'financiacion', nombre: 'Financiación' },
];

/** Donut SVG de concentración (I16). */
function Donut({ fraccion, semaforo, etiqueta }: { fraccion: number; semaforo: TSemaforo; etiqueta: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraccion));
  return (
    <svg role="img" aria-label={etiqueta} viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--superficie-2)" strokeWidth={14} />
      <circle
        cx={50}
        cy={50}
        r={r}
        fill="none"
        stroke={META_SEMAFORO[semaforo].color}
        strokeWidth={14}
        strokeDasharray={`${c * f} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x={50} y={55} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--texto)" className="cifra">
        {num(f * 100, 0)} %
      </text>
    </svg>
  );
}

/** M4 · Nvidia: resultados y tres frentes (#nvidia). */
export default function M4({ s }: PropsModulo) {
  const i13 = ind(s, 'I13');
  const i14 = ind(s, 'I14');
  const i15 = ind(s, 'I15');
  const i16 = ind(s, 'I16');
  const i17 = ind(s, 'I17');
  const i18 = ind(s, 'I18');
  const trimestres = exArr(i13?.extra, 'trimestres');
  const filas13 = trimestres.length
    ? trimestres.map((t) => ({
        etiqueta: (exStr(t, 'trimestre') ?? '').replace(/^FY(\d{4})Q(\d)$/, 'T$2 FY$1'),
        valor: exNum(t, 'ingresos'),
        linea: exNum(t, 'yoy'),
        nota: t.verificado === false ? 'dato manual, sin verificar' : undefined,
      }))
    : (i13?.serie ?? []).map((p) => ({ etiqueta: p.date, valor: p.value }));
  const frentes = esRegistro(i17?.extra) && esRegistro(i17.extra.frentes) ? i17.extra.frentes : {};
  const mayor = exNum(i16?.extra, 'mayor');
  const total = exNum(i16?.extra, 'total');
  return (
    <Modulo id="nvidia" codigo="M4" titulo="Nvidia: resultados y tres frentes" subtitulo="Resultados excelentes, pero el mercado duda de las ventas futuras y de la financiación a clientes.">
      <Rejilla>
        <TarjetaIndicador className={COLS[8]} id="I13" ind={i13} sparkline={false}>
          {filas13.length ? (
            <GraficoBarras
              titulo="Ingresos trimestrales de Nvidia (M$) y crecimiento interanual"
              filas={filas13}
              nombre="Ingresos (M$)"
              formato="musd"
              nombreLinea="Crecimiento interanual"
              formatoLinea="pct"
              color="var(--azul)"
            />
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
        <div className={`${COLS[4]} flex flex-col gap-4`}>
          <TarjetaIndicador id="I14" ind={i14} />
          <TarjetaIndicador id="I18" ind={i18}>
            <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=10-Q" target="_blank" rel="noopener noreferrer" className="enlace text-xs">
              Listado de 10-Q de Nvidia en la SEC
            </a>
          </TarjetaIndicador>
        </div>
        <TarjetaIndicador className={COLS[6]} id="I15" ind={i15} formato="musd">
          {exNum(i15?.extra, 'variacionTrimestral') !== null ? (
            <p className="text-xs text-texto-2">
              Variación trimestral: <span className="cifra text-texto">{pct(exNum(i15?.extra, 'variacionTrimestral'), 1, true)}</span>
              {exNum(i15?.extra, 'ratio') !== null ? (
                <>
                  {' '}
                  · Garantías / ingresos anualizados: <span className="cifra text-texto">{pct(exNum(i15?.extra, 'ratio'))}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </TarjetaIndicador>
        <TarjetaIndicador className={COLS[6]} id="I16" ind={i16} sinValor>
          {i16 && i16.valor !== null ? (
            <div className="flex items-center gap-4">
              <Donut fraccion={i16.valor} semaforo={i16.semaforo} etiqueta={`Concentración de garantías en un solo cliente: ${num(i16.valor * 100, 0)} %`} />
              <div className="text-sm">
                <p className="cifra font-semibold">
                  {musd(mayor)} de {musd(total)}
                </p>
                <p className="text-xs text-texto-2">{exStr(i16.extra, 'descripcion')}</p>
              </div>
            </div>
          ) : (
            <SinDato />
          )}
        </TarjetaIndicador>
        <Tarjeta className={`${COLS[12]} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <TituloTarjeta codigo="I17" href="/indicador/I17">
              {i17?.nombre ?? 'Registro de los tres frentes'}
            </TituloTarjeta>
            {i17 ? <Semaforo valor={i17.semaforo} etiqueta="I17: semáforo" tamano="sm" /> : null}
          </div>
          {i17 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {FRENTES.map((f) => {
                const fr = frentes[f.id];
                const sem = exSemaforo(fr, 'semaforo') ?? 'verde';
                const eventos = esRegistro(fr) && Array.isArray(fr.eventos) ? aEventos(fr.eventos) : [];
                return (
                  <div key={f.id} className="rounded-md border border-borde bg-superficie-2 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold">{f.nombre}</h4>
                      <Semaforo valor={sem} etiqueta={`Frente ${f.nombre}`} tamano="sm" />
                    </div>
                    <RegistroEventos eventos={eventos} vacio="Sin eventos en los últimos 180 días." />
                  </div>
                );
              })}
            </div>
          ) : (
            <SinDato />
          )}
          {i17?.ayuda ? <p className="text-xs text-texto-2">{i17.ayuda}</p> : null}
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

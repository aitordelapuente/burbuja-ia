import clsx from 'clsx';
import type { Semaforo as TSemaforo } from '@/lib/types';
import { num } from '@/lib/calc/formato';
import { Modulo, Rejilla, COLS, Tarjeta, TituloTarjeta } from '../Tarjeta';
import { DiagnosticoEscenario } from '../DiagnosticoEscenario';
import { DiagramaRetroalimentacion, type NodoRetro } from '../DiagramaRetroalimentacion';
import { CitaVideo } from '../CitaVideo';
import { Semaforo } from '../Semaforo';
import { SinDato } from '../SinDato';
import { exSemaforo, exStr, esRegistro } from '../utilidades';
import { ind, type PropsModulo } from './comun';

/** Barra divergente −100…100 (I35). */
function BarraDivergente({ valor }: { valor: number | null }) {
  if (valor === null) return <SinDato />;
  const v = Math.max(-100, Math.min(100, valor));
  return (
    <div>
      <div
        role="meter"
        aria-label="Divergencia financiero-real (F − R)"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(v)}
        aria-valuetext={`${num(v, 1)}`}
        className="relative h-4 w-full rounded-full bg-superficie-2 ring-1 ring-borde"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-texto" />
        <span
          aria-hidden="true"
          className="absolute inset-y-0.5 rounded-full"
          style={{
            left: v >= 0 ? '50%' : `${50 + v / 2}%`,
            width: `${Math.abs(v) / 2}%`,
            background: v >= 0 ? 'var(--azul)' : 'var(--violeta)',
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-texto-2">
        <span>−100 · deterioro real</span>
        <span>0</span>
        <span>+100 · solo financiero</span>
      </div>
    </div>
  );
}

const REGLAS: Array<[string, string]> = [
  ['≥ 3 condiciones en la ventana', 'Pinchazo según Polymarket'],
  ['R ≥ 50, o c4 en ámbar o rojo por tendencia (Δ90d ≤ −25 %), o c5/c6 en «tensión»', 'Escenario 2: el ajuste llega a la economía real'],
  ['F ≥ 60 y R < 25 e I24 Δ30d ≥ 0', 'Escenario 1: corrección financiera, economía real sólida'],
  ['F ≥ 60 y R < 25 e I24 Δ30d < 0', 'Escenario 1 con señales de contagio'],
  ['F < 60 y R < 25', 'Sin pinchazo'],
  ['Ninguna de las anteriores', 'Ajuste mixto'],
];

/** M10 · Escenarios y diagnóstico (#escenarios). */
export default function M10({ s }: PropsModulo) {
  const i35 = ind(s, 'I35');
  const i37 = ind(s, 'I37');
  const cod = s.escenario.codigo;
  const esE1 = cod === 'E1' || cod === 'E1_CONTAGIO';
  const esE2 = cod === 'E2';
  const nodosEx = esRegistro(i37?.extra) && esRegistro(i37.extra.nodos) ? i37.extra.nodos : {};
  const sem = (k: string): TSemaforo => exSemaforo(nodosEx, k) ?? 'sin_dato';
  const nodos: NodoRetro[] = [
    { titulo: 'Financiación cara o cerrada', semaforo: sem('financiacion'), detalle: 'Bono, Fed y ventana de OPV (I30-I32)' },
    { titulo: 'Los laboratorios compran menos cómputo', semaforo: sem('laboratorios'), detalle: 'Financiación de los laboratorios (I29)' },
    { titulo: 'Baja la demanda', semaforo: sem('demanda'), detalle: 'Demanda de cómputo' },
    { titulo: 'Baja el precio del alquiler', semaforo: sem('alquiler'), detalle: 'Alquiler de la H100 (I24)' },
    { titulo: 'Caen las ventas de chips', semaforo: sem('ventas'), detalle: 'Ingresos y previsión (I13, I14)' },
  ];
  return (
    <Modulo id="escenarios" codigo="M10" titulo="Escenarios y diagnóstico">
      <Rejilla>
        <Tarjeta className={COLS[12]}>
          <TituloTarjeta codigo="I36" href="/indicador/I36">
            Diagnóstico de hoy
          </TituloTarjeta>
          <DiagnosticoEscenario escenario={s.escenario} className="mt-2" />
        </Tarjeta>
        <Tarjeta className={clsx(COLS[6], 'flex flex-col gap-2', esE1 && 'ring-2 ring-ambar')}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold">Escenario 1 · Pánico financiero sin reflejo real</h3>
            {esE1 ? <Semaforo valor="ambar" texto="Escenario actual" etiqueta="Escenario 1" tamano="sm" /> : null}
          </div>
          <p className="text-sm text-texto-2">
            Si sobrara capacidad veríamos chips ociosos y alquileres a la baja; no es así. Lo que empeora es el entorno financiero: la Fed sube tipos, el bono a 10 años ronda el 5 %, Nvidia se repliega como financiadora, se estrecha la ventana de OPV y crece el temor regulatorio. Eso rebaja el valor presente de la inversión futura en IA, no la utilidad de los chips instalados.
          </p>
          <p className="text-sm">Como mucho, pinchazo de una burbuja financiera: valoraciones infladas que se ajustan.</p>
          <div className="flex flex-wrap gap-3">
            <CitaVideo t={1118} compacta />
            <CitaVideo t={1165} compacta />
            <CitaVideo t={1192} compacta />
          </div>
        </Tarjeta>
        <Tarjeta className={clsx(COLS[6], 'flex flex-col gap-2', esE2 && 'ring-2 ring-rojo')}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold">Escenario 2 · La bolsa anticipa (o provoca) el ajuste real</h3>
            {esE2 ? <Semaforo valor="rojo" texto="Escenario actual" etiqueta="Escenario 2" tamano="sm" /> : null}
          </div>
          <p className="text-sm text-texto-2">
            El alquiler refleja la escasez de hoy sobre los chips ya instalados; la bolsa descuenta lo que pasará cuando entre en funcionamiento toda la capacidad que está en camino. Así ocurrió con la fibra óptica tras la burbuja puntocom.
          </p>
          <p className="text-sm">Evidencias a vigilar: caída del alquiler de la H100 (Δ90d ≤ −25 %), tensión en OpenAI o Anthropic y R ≥ 50.</p>
          <div className="flex flex-wrap gap-3">
            <CitaVideo t={1249} compacta />
            <CitaVideo t={1254} compacta />
            <CitaVideo t={1414} compacta />
          </div>
        </Tarjeta>
        <Tarjeta className={`${COLS[6]} flex flex-col gap-2`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <TituloTarjeta codigo="I35" href="/indicador/I35">
              Divergencia financiero-real (D = F − R)
            </TituloTarjeta>
            {i35 ? <Semaforo valor={i35.semaforo} etiqueta="I35: semáforo" tamano="sm" /> : null}
          </div>
          <p className="cifra text-2xl font-semibold">{i35?.valor === null || i35?.valor === undefined ? '—' : num(i35.valor, 1)}</p>
          <BarraDivergente valor={i35?.valor ?? null} />
          <p className="text-sm">{exStr(i35?.extra, 'lectura') ?? ''}</p>
          <p className="text-xs text-texto-2">D ≥ 40: pinchazo financiero sin reflejo real · −20 &lt; D &lt; 40: ajuste mixto · D ≤ −20: deterioro real.</p>
        </Tarjeta>
        <Tarjeta className={`${COLS[6]} min-w-0`}>
          <TituloTarjeta>Reglas del diagnóstico (en este orden)</TituloTarjeta>
          <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable">
          <table className="tabla">
            <caption className="sr-only">Reglas deterministas del diagnóstico de escenario</caption>
            <thead>
              <tr>
                <th scope="col">Condición</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {REGLAS.map(([c, r]) => (
                <tr key={r} className={clsx(r === s.escenario.titulo && 'bg-ambar/10 font-semibold')}>
                  <td>{c}</td>
                  <th scope="row" className="font-normal">
                    {r}
                  </th>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Tarjeta>
        <Tarjeta className={`${COLS[12]} flex flex-col gap-2`}>
          <TituloTarjeta codigo="I37" href="/indicador/I37">
            Mecanismo de retroalimentación
          </TituloTarjeta>
          <DiagramaRetroalimentacion nodos={nodos} />
          <p className="text-sm font-medium">«Lo financiero no solo puede anticipar el pinchazo real: puede provocarlo»</p>
          <CitaVideo t={1376} compacta />
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

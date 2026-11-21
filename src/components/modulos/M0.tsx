import type { Semaforo as TSemaforo } from '@/lib/types';
import { POLYMARKET } from '@/lib/config';
import { fecha, num } from '@/lib/calc/formato';
import { Gauge, GaugeIRP } from '../GaugeIRP';
import { ContadorCondiciones } from '../ContadorCondiciones';
import { DiagnosticoEscenario } from '../DiagnosticoEscenario';
import { LimiteError } from '../LimiteError';
import { Tarjeta, COLS, Rejilla } from '../Tarjeta';
import { SinDato } from '../SinDato';
import { CitaVideo } from '../CitaVideo';
import { textoValor } from '../utilidades';
import { ind, type PropsModulo } from './comun';

const BANDAS_PM: Array<{ desde: number; hasta: number; semaforo: TSemaforo }> = [
  { desde: 0, hasta: POLYMARKET.umbrales.verde * 100, semaforo: 'verde' },
  { desde: POLYMARKET.umbrales.verde * 100, hasta: POLYMARKET.umbrales.rojo * 100, semaforo: 'ambar' },
  { desde: POLYMARKET.umbrales.rojo * 100, hasta: 100, semaforo: 'rojo' },
];

export function semaforoProb(p: number | null): TSemaforo {
  if (p === null) return 'sin_dato';
  if (p >= POLYMARKET.umbrales.rojo) return 'rojo';
  if (p >= POLYMARKET.umbrales.verde) return 'ambar';
  return 'verde';
}

/** M0 · Cabecera y veredicto (#resumen). */
export default function M0({ s }: PropsModulo) {
  const principal = s.polymarket.horizontes.find((h) => h.slug === s.polymarket.principal) ?? s.polymarket.horizontes[0];
  const prob = principal?.probSi ?? null;
  const i42 = ind(s, 'I42');
  return (
    <section id="resumen" aria-labelledby="resumen-titulo" className="pb-6 pt-4">
      <h1 id="resumen-titulo" className="text-2xl font-bold tracking-tight sm:text-3xl">
        ¿Ha pinchado la burbuja de la IA?
      </h1>
      <p className="mt-1 text-base text-texto-2 sm:text-lg">{s.escenario.titulo}</p>
      <LimiteError nombre="Resumen">
        <Rejilla className="mt-4">
          <Tarjeta className={`${COLS[4]} flex flex-col items-center gap-2`}>
            <h2 className="self-start text-sm font-semibold">Índice de Riesgo de Pinchazo (IRP)</h2>
            <div data-testid="irp" className="w-full">
              <GaugeIRP irp={s.irp} />
            </div>
            <p className="text-center text-[11px] text-texto-2">
              F <span className="cifra">{num(s.irp.F, 0)}</span> · R <span className="cifra">{num(s.irp.R, 0)}</span> · P{' '}
              <span className="cifra">{num(s.irp.P, 0)}</span> ·{' '}
              <a href="#metodologia" className="enlace">
                cómo se calcula
              </a>
            </p>
          </Tarjeta>
          <Tarjeta className={`${COLS[2]} flex flex-col items-center justify-center`}>
            <h2 className="sr-only">Condiciones de Polymarket en ventana</h2>
            <div data-testid="contador-condiciones">
              <ContadorCondiciones n={s.ventana.n} enVentana={s.ventana.enVentana} condiciones={s.condiciones} />
            </div>
            <a href="#condiciones" className="enlace mt-2 text-xs">
              Ver las 6 condiciones
            </a>
          </Tarjeta>
          <Tarjeta className={`${COLS[3]} flex flex-col items-center gap-2`}>
            <h2 className="self-start text-sm font-semibold">Probabilidad en Polymarket</h2>
            <div data-testid="polymarket-prob" className="w-full">
              {principal ? (
                <>
                  <Gauge
                    valor={prob === null ? null : prob * 100}
                    semaforo={semaforoProb(prob)}
                    etiqueta={`Probabilidad del «Sí» en Polymarket: ${principal.titulo}`}
                    textoValor={prob === null ? '—' : num(prob * 100, 1)}
                    unidad=" %"
                    bandas={BANDAS_PM}
                    textoEstado={prob === null ? 'Sin dato' : `${num(prob * 100, 1)} %`}
                  />
                  <p className="mt-1 text-center text-xs text-texto-2">Pinchazo antes del {fecha(principal.fin)}</p>
                </>
              ) : (
                <p className="text-center text-sm text-texto-2">Sin mercado activo</p>
              )}
            </div>
            <p className="text-center text-[11px] text-texto-2">Polymarket refleja lo que apuesta el mercado; el IRP, lo que dicen los datos.</p>
          </Tarjeta>
          <Tarjeta className={COLS[3]}>
            <h2 className="mb-2 text-sm font-semibold">Diagnóstico</h2>
            <div data-testid="diagnostico">
              <DiagnosticoEscenario escenario={s.escenario} compacto />
            </div>
            <a href="#escenarios" className="enlace mt-2 inline-block text-xs">
              Ver los escenarios
            </a>
          </Tarjeta>
          <Tarjeta className={`${COLS[12]} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-texto-2">Lectura del día</h2>
              {s.fraseDelDia ? <p className="mt-1 text-sm sm:text-base">{s.fraseDelDia}</p> : <SinDato />}
            </div>
            {i42 ? (
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[11px] text-texto-2">Valor evaporado de Nvidia desde máximos (I42)</p>
                <p className="cifra text-xl font-semibold">{textoValor(i42) ?? '—'}</p>
                <CitaVideo t={i42.citaVideo?.t ?? 1437} compacta />
              </div>
            ) : null}
          </Tarjeta>
        </Rejilla>
      </LimiteError>
    </section>
  );
}

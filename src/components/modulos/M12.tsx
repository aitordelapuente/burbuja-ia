import Link from 'next/link';
import { IRP, VIDEO } from '@/lib/config';
import { num } from '@/lib/calc/formato';
import { Modulo, Rejilla, COLS, Tarjeta, TituloTarjeta } from '../Tarjeta';
import { Semaforo } from '../Semaforo';
import { CitaVideo } from '../CitaVideo';
import { cuandoTexto } from '../InsigniaFuente';
import type { PropsModulo } from './comun';

export const LIMITACIONES: string[] = [
  'c4 oficial: la API de Silicon Data es de pago. Sin clave, el investigador (J2) lee la página pública con cita verificada y, si falla, se usa el proxy gratuito IAA (RunPod, Vast, Azure y AWS). El proxy no cuenta para el criterio de Polymarket. IAA_neo da hoy 2,69 $/h frente a los 3,08 de Silicon Data: es otra metodología.',
  'Términos de uso: la lectura de la página de Silicon Data y del JSON de precios de AWS (no oficial) puede no estar permitida o cambiar sin aviso. Si se detecta un cambio o un bloqueo, esa fuente queda desactivada y el resto sigue.',
  'Vast.ai devuelve pocas ofertas a demanda de H100 SXM (11 el 21/11/2026), lo que hace la mediana ruidosa; por eso se usa como uno de tres componentes.',
  'GDELT es gratuito, pero en la prueba devolvió el aviso de límite de uso en vez de JSON; es una fuente opcional.',
  'OpenAI es privada: sus eventos de quiebra, adquisición o financiación dependen de comunicados y medios, no de un registro oficial estructurado.',
  'Garantías de Nvidia: el XBRL lleva un trimestre de retraso respecto al 8-K. Se cubre con el CFO commentary («up to a maximum of $105 billion»). El total de 118.000 M$ del vídeo sale de la tabla del mismo documento.',
  'Supermicro: el vídeo omite su caída. Está alrededor de un −82 % desde su máximo de marzo de 2024 y se trata como «cumplida heredada» (D7). Conviene vigilar cómo lo interpreta Polymarket.',
  'Cifras inaudibles o dudosas del audio: H100 en diciembre de 2025 y la fibra en 2002. Quedan marcadas y rotan cuando hay un dato verificado.',
  'Hechos del vídeo sin fuente primaria todavía («Megaspeed», la salida de Jensen Huang y las investigaciones de la SEC): mientras no haya una cita verificada, se muestran como «Dato del vídeo, sin verificar».',
  'Yahoo Finance es una API no oficial (D14): si bloquea las peticiones, se sirve el último dato con aviso de antigüedad.',
  'La única degradación sin persona es un cambio de formato de una fuente que no se arregle automáticamente: el dato queda marcado como antiguo y la incidencia, abierta.',
];

const NOMBRE_COMP: Record<string, string> = {
  c1: 'c1 · NVDA',
  c2: 'c2 · SOXX',
  c3: 'c3 · Proveedores',
  c4: 'c4 · H100',
  c5: 'c5 · Quiebra de un laboratorio',
  c6: 'c6 · Adquisición de OpenAI',
  I30: 'I30 · Bono a 10 años',
  I31: 'I31 · Fed',
  I32: 'I32 · Ventana de OPV',
  I33: 'I33 · Repliegue de Nvidia',
  I34: 'I34 · Regulación',
};

const SUB: Array<{ k: 'F' | 'R' | 'P'; nombre: string; pesos: Record<string, number> }> = [
  { k: 'F', nombre: 'F · Financiero', pesos: IRP.pesosF },
  { k: 'R', nombre: 'R · Real', pesos: IRP.pesosR },
  { k: 'P', nombre: 'P · Puente de financiación', pesos: IRP.pesosP },
];

/** M12 · Metodología y fuentes (#metodologia). */
export default function M12({ s }: PropsModulo) {
  const comp = s.irp.componentes ?? {};
  return (
    <Modulo id="metodologia" codigo="M12" titulo="Metodología y fuentes">
      <Rejilla>
        <Tarjeta className={`${COLS[12]} flex flex-col gap-3`}>
          <TituloTarjeta>Cómo se calcula el Índice de Riesgo de Pinchazo (IRP)</TituloTarjeta>
          <p className="text-sm text-texto-2">
            Cada componente se lleva a una escala de 0 a 100 («proximidad al pinchazo»). Con ellos se forman tres subíndices y el IRP ={' '}
            <span className="cifra">
              {num(IRP.pesosGlobal.F, 2)}·F + {num(IRP.pesosGlobal.R, 2)}·R + {num(IRP.pesosGlobal.P, 2)}·P
            </span>
            . Lo real pesa más porque el vídeo concluye que el pinchazo significativo es el de la economía real; P pesa porque es el canal de transmisión de lo financiero a lo real. Si se cumplen 3 o más condiciones en la ventana, el IRP se muestra como «100 · PINCHAZO (criterio Polymarket)». Si falta un componente, se renormalizan los pesos de su subíndice y se avisa de «IRP parcial». El IRP no incluye la probabilidad de Polymarket, para evitar la circularidad. Los pesos y las bandas son propuestos por el panel (D11).
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {SUB.map((sb) => (
              <div key={sb.k} className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable">
                <table className="tabla">
                  <caption className="mb-1 text-left text-sm font-semibold text-texto">
                    {sb.nombre}: <span className="cifra">{num(s.irp[sb.k], 1)}</span>
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Componente</th>
                      <th scope="col" className="num">Peso</th>
                      <th scope="col" className="num">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sb.pesos).map(([k, w]) => (
                      <tr key={k}>
                        <th scope="row" className="font-normal">
                          {NOMBRE_COMP[k] ?? k}
                        </th>
                        <td className="num">{num(w * 100, 0)} %</td>
                        <td className="num">{comp[k] === null || comp[k] === undefined ? 'sin dato' : num(comp[k], 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {IRP.bandas.map((b, i) => (
              <li key={b.etiqueta}>
                <Semaforo valor={b.semaforo} texto={`${i === 0 ? 0 : IRP.bandas[i - 1].hasta}–${Math.min(100, b.hasta - 1)}: ${b.etiqueta}`} etiqueta="Banda del IRP" tamano="sm" />
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta className={`${COLS[6]} min-w-0`}>
          <TituloTarjeta>Fuentes y estado de los conectores</TituloTarjeta>
          {s.salud.length ? (
            <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable">
            <table className="tabla">
              <caption className="sr-only">Estado de cada conector de datos</caption>
              <thead>
                <tr>
                  <th scope="col">Conector</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Consulta</th>
                </tr>
              </thead>
              <tbody>
                {s.salud.map((c) => (
                  <tr key={c.conector}>
                    <th scope="row" className="font-medium">
                      {c.conector}
                    </th>
                    <td>
                      <Semaforo
                        valor={!c.ok ? (c.error?.startsWith('sin_clave') ? 'ambar' : 'rojo') : c.stale ? 'ambar' : 'verde'}
                        texto={!c.ok ? (c.error?.startsWith('sin_clave') ? 'Sin clave (datos manuales)' : 'Sin respuesta') : c.stale ? 'Dato antiguo' : 'Correcto'}
                        etiqueta={`Estado de ${c.conector}`}
                        tamano="sm"
                      />
                      {c.error ? <span className="block text-[11px] text-texto-2">{c.error}</span> : null}
                    </td>
                    <td className="cifra text-xs">{cuandoTexto(c.fetchedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-texto-2">Sin información de los conectores.</p>
          )}
          <p className="mt-2 text-xs text-texto-2">
            Fuentes: Yahoo Finance (cierres diarios, no oficial), FRED, Polymarket (Gamma y CLOB), SEC EDGAR, Silicon Data, índice abierto de alquiler y datos manuales del repositorio, siempre señalados.
          </p>
        </Tarjeta>

        <Tarjeta className={COLS[6]}>
          <TituloTarjeta>Limitaciones</TituloTarjeta>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-texto-2">
            {LIMITACIONES.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </Tarjeta>

        <Tarjeta className={`${COLS[12]} flex flex-col gap-2`}>
          <TituloTarjeta>El vídeo</TituloTarjeta>
          <p className="text-sm">
            <a href={VIDEO.url} target="_blank" rel="noopener noreferrer" className="enlace">
              «{VIDEO.titulo}»
            </a>{' '}
            · {VIDEO.canal} · 21/11/2026 · 24:33
          </p>
          <CitaVideo t={1448} texto="La revolución de la IA es cada vez más innegable; queda por ver si están justificados los precios y la estructura de mercado" />
          <p className="text-xs text-texto-2">
            Todas las afirmaciones del vídeo y el lugar del panel donde se reflejan están en la{' '}
            <Link href="/trazabilidad" className="enlace">
              tabla de trazabilidad
            </Link>
            .
          </p>
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

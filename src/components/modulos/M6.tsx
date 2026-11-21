import { Modulo, Rejilla, COLS, Tarjeta, TituloTarjeta } from '../Tarjeta';
import { TablaProveedores } from '../TablaProveedores';
import { CitaVideo } from '../CitaVideo';
import { InsigniaFuente } from '../InsigniaFuente';
import { AvisoStale } from '../AvisoStale';
import { Semaforo } from '../Semaforo';
import { AYUDA_CONDICIONES, textoValor } from '../utilidades';
import { cond, ind, type PropsModulo } from './comun';

/** M6 · Proveedores de hardware (#proveedores). */
export default function M6({ s }: PropsModulo) {
  const c3 = cond(s, 'c3');
  const i23 = ind(s, 'I23');
  return (
    <Modulo id="proveedores" codigo="M6" titulo="Proveedores de hardware" subtitulo={AYUDA_CONDICIONES.c3}>
      <Rejilla>
        <Tarjeta className={`${COLS[12]} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <TituloTarjeta codigo="I23" href="/indicador/I23">
              {i23?.nombre ?? 'Tabla de proveedores (c3 desglosada)'}
            </TituloTarjeta>
            {i23 ? <Semaforo valor={i23.semaforo} etiqueta="I23: semáforo" tamano="sm" /> : null}
          </div>
          {i23 ? <p className="cifra text-base font-semibold">{textoValor(i23)}</p> : null}
          {c3?.stale ? <AvisoStale actualizadoEn={c3.actualizadoEn} /> : null}
          <TablaProveedores detalle={c3?.detalle} />
          <div className="flex flex-wrap gap-4">
            <CitaVideo t={793} texto="C3 lejos; Broadcom −37 %, ASML −36 %, TSMC −34 %, Arista −23 %" />
            <CitaVideo t={818} texto="Broadcom 305 $; umbral 241 $" />
          </div>
          <InsigniaFuente fuente={c3?.fuente ?? i23?.fuente} actualizadoEn={c3?.actualizadoEn ?? i23?.actualizadoEn} />
        </Tarjeta>
      </Rejilla>
    </Modulo>
  );
}

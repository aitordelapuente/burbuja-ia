import semilla from '../../../data/seed/puntocom.json';
import { Modulo } from '../Tarjeta';
import { ComparadorPuntocom, type DatosPuntocom } from '../ComparadorPuntocom';
import { exArr, exStr } from '../utilidades';
import { ind, type PropsModulo } from './comun';

/** M11 · Comparación con la burbuja puntocom (#puntocom). */
export default function M11({ s }: PropsModulo) {
  const i39 = ind(s, 'I39');
  const fibra = exArr(i39?.extra, 'fibra');
  const demanda = exArr(i39?.extra, 'demanda');
  const datos: DatosPuntocom = {
    fibra: (fibra.length ? fibra : semilla.fibra) as DatosPuntocom['fibra'],
    demanda: (demanda.length ? demanda : semilla.demanda) as DatosPuntocom['demanda'],
    texto: exStr(i39?.extra, 'texto') ?? semilla.texto,
  };
  return (
    <Modulo id="puntocom" codigo="M11" titulo="Comparación con la burbuja puntocom" subtitulo="El precedente del escenario 2: la bolsa cae primero y el precio de la capacidad, después.">
      <ComparadorPuntocom i38={ind(s, 'I38')} i39={i39} i40={ind(s, 'I40')} puntocom={datos} respaldoNasdaq={ind(s, 'I01')?.series?.completa} />
    </Modulo>
  );
}

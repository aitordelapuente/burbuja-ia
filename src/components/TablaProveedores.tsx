import clsx from 'clsx';
import type { DetalleProveedor, Semaforo as TSemaforo } from '@/lib/types';
import { CONDICIONES } from '@/lib/config';
import { fecha, num, pct, usd } from '@/lib/calc/formato';
import { Semaforo } from './Semaforo';
import { SinDato } from './SinDato';

function estadoProveedor(p: DetalleProveedor): { texto: string; semaforo: TSemaforo } {
  if (p.heredada) return { texto: 'Heredada', semaforo: 'sin_dato' };
  if (p.close <= p.umbral || p.fechaSuceso) return { texto: 'CUMPLIDA', semaforo: 'rojo' };
  if (p.proximidad >= CONDICIONES.estados.muyCerca) return { texto: 'MUY CERCA', semaforo: 'naranja' };
  if (p.proximidad >= CONDICIONES.estados.vigilancia) return { texto: 'VIGILANCIA', semaforo: 'ambar' };
  return { texto: 'LEJOS', semaforo: 'verde' };
}

/** Ordena por proximidad (mayor primero); las heredadas al final (I23). */
export function ordenarProveedores(detalle: DetalleProveedor[]): DetalleProveedor[] {
  return [...detalle].sort((a, b) => Number(a.heredada) - Number(b.heredada) || b.proximidad - a.proximidad);
}

/** Tabla de proveedores (c3 desglosada, I23). */
export function TablaProveedores({ detalle, className }: { detalle: DetalleProveedor[] | undefined; className?: string }) {
  if (!detalle || detalle.length === 0) return <SinDato />;
  const filas = ordenarProveedores(detalle);
  const cercana = filas.find((p) => !p.heredada);
  return (
    <div className={clsx('w-full', className)}>
      <div className="overflow-x-auto rounded-md border border-borde">
        <table className="tabla min-w-[760px]">
          <caption className="sr-only">
            Proveedores de hardware: máximo, cierre, caída, precio umbral (−50 %), distancia restante y estado. Ordenados por proximidad al umbral.
          </caption>
          <thead>
            <tr>
              <th scope="col">Empresa</th>
              <th scope="col">Papel</th>
              <th scope="col" className="num">Máximo (fecha)</th>
              <th scope="col" className="num">Cierre</th>
              <th scope="col" className="num">Caída</th>
              <th scope="col" className="num">Precio umbral (50 %)</th>
              <th scope="col" className="num">Distancia restante</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => {
              const e = estadoProveedor(p);
              const destacada = cercana?.ticker === p.ticker;
              return (
                <tr key={p.ticker} className={clsx(destacada && 'bg-ambar/10', p.heredada && 'text-texto-2')}>
                  <th scope="row" className="font-semibold">
                    {p.nombre} <span className="cifra text-[11px] font-normal text-texto-2">{p.ticker}</span>
                    {destacada ? <span className="block text-[11px] font-medium text-ambar-tx">La más cercana</span> : null}
                  </th>
                  <td>{p.papel}</td>
                  <td className="num">
                    {usd(p.ath)}
                    <span className="block text-[11px] text-texto-2">{fecha(p.athFecha)}</span>
                  </td>
                  <td className="num">
                    {usd(p.close)}
                    <span className="block text-[11px] text-texto-2">{fecha(p.fecha)}</span>
                  </td>
                  <td className="num">{pct(p.dd)}</td>
                  <td className="num">{usd(p.umbral)}</td>
                  <td className="num">{p.close <= p.umbral ? 'superado' : pct(p.distancia)}</td>
                  <td>
                    <Semaforo valor={e.semaforo} texto={e.texto} etiqueta={`${p.nombre}: estado`} tamano="sm" />
                    <span className="sr-only">Proximidad {num(p.proximidad, 0)} sobre 100.</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filas.some((p) => p.heredada) ? (
        <ul className="mt-2 space-y-0.5 text-xs text-texto-2">
          {filas
            .filter((p) => p.heredada)
            .map((p) => (
              <li key={p.ticker}>
                {p.nombre}: cumplida desde {fecha(p.cumplidaDesde)}; Polymarket y el vídeo no la cuentan como suceso nuevo.
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

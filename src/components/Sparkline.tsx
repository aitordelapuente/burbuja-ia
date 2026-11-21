import clsx from 'clsx';
import type { Punto } from '@/lib/types';
import { fecha } from '@/lib/calc/formato';
import { VistaTabla } from './VistaTabla';
import { formatear, type TipoFormato } from './utilidades';

/** Divide la serie en tramos cuando hay huecos grandes (no se interpola, sección 13). */
export function tramos(puntos: Punto[]): Punto[][] {
  const difs: number[] = [];
  for (let i = 1; i < puntos.length; i++) difs.push((Date.parse(puntos[i].date) - Date.parse(puntos[i - 1].date)) / 86_400_000);
  difs.sort((a, b) => a - b);
  const mediana = difs.length ? difs[Math.floor(difs.length / 2)] : 1;
  const huecoDias = Math.max(10, mediana * 5);
  const out: Punto[][] = [];
  let actual: Punto[] = [];
  let prev: number | null = null;
  for (const p of puntos) {
    const t = Date.parse(p.date);
    if (prev !== null && (t - prev) / 86_400_000 > huecoDias) {
      if (actual.length) out.push(actual);
      actual = [];
    }
    actual.push(p);
    prev = t;
  }
  if (actual.length) out.push(actual);
  return out;
}

/** Reduce a ~n puntos reales (uno de cada k), conservando el último. */
function muestrear(puntos: Punto[], n: number): Punto[] {
  if (puntos.length <= n) return puntos;
  const k = Math.ceil(puntos.length / n);
  let iMin = 0;
  let iMax = 0;
  puntos.forEach((p, i) => {
    if (p.value < puntos[iMin].value) iMin = i;
    if (p.value > puntos[iMax].value) iMax = i;
  });
  // Se conservan el mínimo y el máximo para no deformar la forma de la serie.
  return puntos.filter((_, i) => i % k === 0 || i === puntos.length - 1 || i === iMin || i === iMax);
}

/**
 * Sparkline en SVG (servidor). Opcionalmente dibuja una serie de umbral escalonada.
 * Lleva role="img", aria-label con resumen y botón «Ver datos en tabla».
 */
export function Sparkline({
  puntos,
  umbral,
  umbralFijo,
  titulo,
  formato = 'num',
  color = 'var(--azul)',
  dias = 365,
  className,
  altura = 56,
}: {
  puntos: Punto[] | undefined;
  umbral?: Punto[];
  umbralFijo?: number | null;
  titulo: string;
  formato?: TipoFormato;
  color?: string;
  dias?: number;
  className?: string;
  altura?: number;
}) {
  const todos = puntos ?? [];
  if (todos.length < 2) return null;
  const ultimaFecha = Date.parse(todos[todos.length - 1].date);
  const desde = ultimaFecha - dias * 86_400_000;
  const serieCompleta = todos.filter((p) => Date.parse(p.date) >= desde);
  if (serieCompleta.length < 2) return null;
  // Para dibujar basta con ~130 puntos reales (no se interpola); el umbral escalonado solo cambia en los saltos.
  const serie = muestrear(serieCompleta, 130);
  const um = (umbral ?? []).filter((p, i, a) => Date.parse(p.date) >= desde && (i === 0 || i === a.length - 1 || p.value !== a[i - 1].value));

  const valores = [...serie.map((p) => p.value), ...um.map((p) => p.value)];
  if (umbralFijo !== null && umbralFijo !== undefined) valores.push(umbralFijo);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const t0 = Date.parse(serie[0].date);
  const t1 = Date.parse(serie[serie.length - 1].date);
  const W = 300;
  const H = 60;
  const x = (d: string) => ((Date.parse(d) - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => H - 4 - ((v - min) / rango) * (H - 8);

  const lineas = tramos(serie).map((tr) => tr.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(''));
  let pathUmbral = '';
  if (um.length > 1) {
    pathUmbral = um
      .map((p, i) => {
        const px = x(p.date).toFixed(1);
        const py = y(p.value).toFixed(1);
        if (i === 0) return `M${px},${py}`;
        const prevY = y(um[i - 1].value).toFixed(1);
        return `L${px},${prevY}L${px},${py}`;
      })
      .join('');
    pathUmbral += `L${W},${y(um[um.length - 1].value).toFixed(1)}`;
  }

  const ultimo = serieCompleta[serieCompleta.length - 1];
  const primero = serieCompleta[0];
  const minP = serieCompleta.reduce((a, b) => (b.value < a.value ? b : a));
  const maxP = serieCompleta.reduce((a, b) => (b.value > a.value ? b : a));
  const resumen =
    `${titulo}: del ${fecha(primero.date)} (${formatear(primero.value, formato)}) al ${fecha(ultimo.date)} (${formatear(ultimo.value, formato)}). ` +
    `Máximo ${formatear(maxP.value, formato)} el ${fecha(maxP.date)}; mínimo ${formatear(minP.value, formato)} el ${fecha(minP.date)}.` +
    (um.length ? ` Umbral actual ${formatear(um[um.length - 1].value, formato)}.` : '') +
    (umbralFijo !== null && umbralFijo !== undefined ? ` Umbral ${formatear(umbralFijo, formato)}.` : '');

  const filasTabla = muestrear(serieCompleta, 53)
    .slice()
    .reverse()
    .map((p) => [fecha(p.date), formatear(p.value, formato)]);

  return (
    <div className={clsx('w-full', className)}>
      <svg
        role="img"
        aria-label={resumen}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: altura }}
      >
        {pathUmbral ? (
          <path d={pathUmbral} fill="none" stroke="var(--rojo)" strokeWidth={1.2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        ) : null}
        {umbralFijo !== null && umbralFijo !== undefined ? (
          <line x1={0} x2={W} y1={y(umbralFijo)} y2={y(umbralFijo)} stroke="var(--rojo)" strokeWidth={1.2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        ) : null}
        {lineas.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <VistaTabla titulo={`${titulo} (muestra de cierres)`} columnas={['Fecha', 'Valor']} filas={filasTabla} numericas={[1]} />
    </div>
  );
}

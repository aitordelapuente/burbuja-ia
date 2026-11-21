// I41: frase del día (plantilla determinista, sin LLM — D12).
import { pct, num } from './formato';

export function fraseDelDia(a: {
  n: number;
  probPolymarket: number | null;
  distNvda: number | null;
  h100: number | null;
  h100Delta30: number | null;
  diagnostico: string;
}): string {
  const p = a.probPolymarket === null ? 'sin dato' : `${num(a.probPolymarket * 100, 1)} %`;
  const dist = a.distNvda === null ? 'sin dato' : pct(a.distNvda, 1);
  const h = a.h100 === null ? 'sin dato' : num(a.h100, 2);
  const d30 = a.h100Delta30 === null ? 'sin dato' : pct(a.h100Delta30, 1, true);
  return `${a.n}/6 condiciones en ventana · Polymarket ${p} · NVDA a ${dist} de su umbral · H100 a ${h} $/h (${d30} en 30 días). Lectura: ${a.diagnostico}.`;
}

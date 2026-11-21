// Parseo de los CSV de datos (sin dependencias). Admite campos entre comillas.
import { GpuCsvFilaSchema, GpuAbiertoFilaSchema } from '../schemas';

export function parsearCsv(texto: string): Record<string, string>[] {
  const lineas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (!lineas.length) return [];
  const partir = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (q) {
        if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const cab = partir(lineas[0]).map((s) => s.trim());
  return lineas.slice(1).map((l) => {
    const v = partir(l);
    // los campos sobrantes se unen al último (p. ej., comas en una nota)
    if (v.length > cab.length) v.splice(cab.length - 1, v.length, v.slice(cab.length - 1).join(','));
    return Object.fromEntries(cab.map((c, i) => [c, (v[i] ?? '').trim()]));
  });
}

export function parsearGpuCsv(texto: string) {
  return parsearCsv(texto).map((f, i) => {
    const r = GpuCsvFilaSchema.safeParse({
      fecha: f.fecha,
      gpu: f.gpu,
      indice: f.indice,
      usd_hora: f.usd_hora === '' ? null : Number(f.usd_hora),
      fuente: f.fuente,
      verificado: f.verificado === 'true',
    });
    if (!r.success) throw new Error(`[manual] gpu_alquiler.csv fila ${i + 2} inválida: ${r.error.issues.map((x) => x.path.join('.')).join(', ')}`);
    return r.data;
  });
}

export function parsearGpuAbiertoCsv(texto: string) {
  return parsearCsv(texto).map((f, i) => {
    const r = GpuAbiertoFilaSchema.safeParse({ ...f, valor: Number(f.valor) });
    if (!r.success) throw new Error(`[auto] gpu_alquiler_abierto.csv fila ${i + 2} inválida`);
    return r.data;
  });
}

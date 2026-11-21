// Lectura y escritura de los ficheros de datos (CSV sencillos y JSON {_ayuda, items}) y argumentos de línea de órdenes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Directorio por defecto de la salida para el workflow (fuera del árbol de trabajo, para que no entre en el PR). */
export const SALIDA_POR_DEFECTO = join(tmpdir(), 'panel-pinchazo-bot');

export type FilaCsv = Record<string, string>;

/** Separa una línea CSV respetando comillas dobles. */
export function partirLineaCsv(linea: string): string[] {
  const out: string[] = [];
  let actual = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (comillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') comillas = false;
      else actual += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') {
      out.push(actual);
      actual = '';
    } else actual += c;
  }
  out.push(actual);
  return out;
}

export function parsearCsv(texto: string): { cabecera: string[]; filas: FilaCsv[] } {
  const lineas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (lineas.length === 0) return { cabecera: [], filas: [] };
  const cabecera = partirLineaCsv(lineas[0]);
  const filas = lineas.slice(1).map((l) => {
    const v = partirLineaCsv(l);
    return Object.fromEntries(cabecera.map((c, i) => [c, v[i] ?? '']));
  });
  return { cabecera, filas };
}

const escaparCsv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function serializarCsv(cabecera: string[], filas: FilaCsv[]): string {
  return [cabecera.join(','), ...filas.map((f) => cabecera.map((c) => escaparCsv(f[c] ?? '')).join(','))].join('\n') + '\n';
}

export function leerCsv(ruta: string, cabeceraPorDefecto: string[]): { cabecera: string[]; filas: FilaCsv[] } {
  if (!existsSync(ruta)) return { cabecera: cabeceraPorDefecto, filas: [] };
  const r = parsearCsv(readFileSync(ruta, 'utf8'));
  return { cabecera: r.cabecera.length ? r.cabecera : cabeceraPorDefecto, filas: r.filas };
}

export function escribirFichero(ruta: string, contenido: string) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido);
}

export interface FicheroItems<T = Record<string, unknown>> {
  _ayuda: string;
  items: T[];
  [k: string]: unknown;
}

export function leerJsonItems<T = Record<string, unknown>>(ruta: string, ayuda = ''): FicheroItems<T> {
  if (!existsSync(ruta)) return { _ayuda: ayuda, items: [] };
  const j = JSON.parse(readFileSync(ruta, 'utf8')) as Partial<FicheroItems<T>>;
  return { ...j, _ayuda: j._ayuda ?? ayuda, items: Array.isArray(j.items) ? j.items : [] };
}

export function escribirJson(ruta: string, datos: unknown) {
  escribirFichero(ruta, JSON.stringify(datos, null, 2) + '\n');
}

/** Lee `--clave=valor` y `--bandera`. */
export function leerArgs(argv: string[] = process.argv.slice(2)): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] ?? 'true';
  }
  return out;
}

/** Salida para el workflow: cuerpo del PR, etiquetas y bandera de cambios (fuera del árbol de trabajo). */
export function escribirSalidaPR(dir: string, args: { cuerpo: string; etiquetas: string[]; hayCambios: boolean; titulo?: string }) {
  escribirFichero(`${dir}/pr-body.md`, args.cuerpo);
  escribirFichero(`${dir}/labels.txt`, args.etiquetas.join('\n') + '\n');
  escribirFichero(`${dir}/hay-cambios.txt`, args.hayCambios ? 'true\n' : 'false\n');
  if (args.titulo) escribirFichero(`${dir}/pr-title.txt`, args.titulo + '\n');
}

/** Escribe `clave=valor` en $GITHUB_OUTPUT si existe. */
export function salidaActions(clave: string, valor: string) {
  const f = process.env.GITHUB_OUTPUT;
  if (!f) return;
  writeFileSync(f, `${clave}=${valor}\n`, { flag: 'a' });
}

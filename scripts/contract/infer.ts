// «Esquema observado» de una respuesta JSON (sección 18.6): claves y tipos, sin valores.
// Objetos con muchas claves dinámicas (p. ej. tipos de instancia de AWS o fechas) se tratan como mapas («*»).

export type Esquema =
  | { type: 'null' | 'string' | 'number' | 'boolean' }
  | { type: 'array'; items: Esquema | null }
  | { type: 'object'; properties: Record<string, Esquema> }
  | { type: 'map'; values: Esquema | null }
  | { type: 'union'; anyOf: Esquema[] };

export interface OpcionesInferencia {
  /** Elementos de cada array que se muestrean. */
  muestra?: number;
  /** A partir de cuántas claves un objeto se considera un mapa dinámico. */
  umbralMapa?: number;
  profundidadMax?: number;
  /** Claves que no se incluyen (p. ej. las marcas «_fixture» de los fixtures sintéticos). */
  ignorar?: (clave: string) => boolean;
}

const firma = (e: Esquema) => JSON.stringify(e);

export function unir(a: Esquema | null, b: Esquema | null): Esquema | null {
  if (!a) return b;
  if (!b) return a;
  if (firma(a) === firma(b)) return a;
  if (a.type === 'object' && b.type === 'object') {
    const props: Record<string, Esquema> = { ...a.properties };
    for (const [k, v] of Object.entries(b.properties)) props[k] = props[k] ? (unir(props[k], v) as Esquema) : v;
    return { type: 'object', properties: ordenar(props) };
  }
  if (a.type === 'array' && b.type === 'array') return { type: 'array', items: unir(a.items, b.items) };
  if (a.type === 'map' && b.type === 'map') return { type: 'map', values: unir(a.values, b.values) };
  const variantes = [...(a.type === 'union' ? a.anyOf : [a]), ...(b.type === 'union' ? b.anyOf : [b])];
  const unicas: Esquema[] = [];
  for (const v of variantes) {
    const igualTipo = unicas.findIndex((u) => u.type === v.type);
    if (igualTipo >= 0) unicas[igualTipo] = unir(unicas[igualTipo], v) as Esquema;
    else unicas.push(v);
  }
  unicas.sort((x, y) => x.type.localeCompare(y.type));
  return unicas.length === 1 ? unicas[0] : { type: 'union', anyOf: unicas };
}

const ordenar = (o: Record<string, Esquema>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

export function inferirEsquema(obj: unknown, opciones: OpcionesInferencia = {}, profundidad = 0): Esquema {
  const { muestra = 20, umbralMapa = 40, profundidadMax = 12 } = opciones;
  if (obj === null || obj === undefined) return { type: 'null' };
  if (Array.isArray(obj)) {
    let items: Esquema | null = null;
    if (profundidad < profundidadMax) for (const x of obj.slice(0, muestra)) items = unir(items, inferirEsquema(x, opciones, profundidad + 1));
    return { type: 'array', items };
  }
  switch (typeof obj) {
    case 'string':
      return { type: 'string' };
    case 'number':
    case 'bigint':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object': {
      const entradas = Object.entries(obj as Record<string, unknown>).filter(([k]) => !opciones.ignorar?.(k));
      if (profundidad >= profundidadMax) return { type: 'object', properties: {} };
      // Solo es un mapa si sus claves parecen datos (fechas, ids, «p5.48xlarge»), no nombres de campo: un objeto real
      // de la API con muchas propiedades (Gamma, Vast) sigue siendo un objeto.
      const pareceCampo = (k: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) && !/^\d/.test(k);
      const dinamicas = entradas.filter(([k]) => !pareceCampo(k)).length;
      if (entradas.length >= umbralMapa && dinamicas / entradas.length >= 0.5) {
        let values: Esquema | null = null;
        for (const [, v] of entradas.slice(0, muestra)) values = unir(values, inferirEsquema(v, opciones, profundidad + 1));
        return { type: 'map', values };
      }
      return { type: 'object', properties: ordenar(Object.fromEntries(entradas.map(([k, v]) => [k, inferirEsquema(v, opciones, profundidad + 1)]))) };
    }
    default:
      return { type: 'string' };
  }
}

/** Esquema de un CSV (FRED): solo la cabecera. */
export function inferirCsv(texto: string): Esquema {
  const cabecera = (texto.split(/\r?\n/)[0] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return { type: 'object', properties: ordenar(Object.fromEntries(cabecera.map((c) => [c, { type: 'string' } as Esquema]))) };
}

const describir = (e: Esquema | null): string => {
  if (!e) return 'vacío';
  switch (e.type) {
    case 'array':
      return `array<${e.items ? (e.items.type === 'object' ? 'object' : describir(e.items)) : 'vacío'}>`;
    case 'union':
      return e.anyOf.map(describir).join('|');
    case 'map':
      return 'map';
    default:
      return e.type;
  }
};

/** Aplana el esquema en líneas «ruta → tipo», con la clave final separada para el diff. */
export function aplanar(e: Esquema | null, ruta = ''): Array<{ padre: string; clave: string; tipo: string }> {
  const out: Array<{ padre: string; clave: string; tipo: string }> = [];
  const bajar = (hijo: Esquema | null, padre: string) => {
    if (!hijo) return;
    if (hijo.type === 'object') for (const [k, v] of Object.entries(hijo.properties)) {
      out.push({ padre, clave: k, tipo: describir(v) });
      out.push(...aplanar(v, padre ? `${padre}.${k}` : k));
    }
    else if (hijo.type === 'array') bajar(hijo.items, `${padre}[]`);
    else if (hijo.type === 'map') bajar(hijo.values, `${padre}.*`);
    else if (hijo.type === 'union') for (const v of hijo.anyOf) bajar(v, padre);
  };
  bajar(e, ruta);
  const vistos = new Set<string>();
  return out.filter((l) => {
    const k = `${l.padre}|${l.clave}|${l.tipo}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

export interface DiffEsquema {
  /** Claves esperadas que faltan o cambian de tipo: rompen el contrato. */
  eliminadas: string[];
  /** Claves nuevas: no rompen. */
  nuevas: string[];
  roto: boolean;
  texto: string;
}

/** Diff legible: «- close: array<number|null> @ chart.result[].indicators.quote[]». */
export function diffEsquemas(esperado: Esquema | null, observado: Esquema | null): DiffEsquema {
  const fmt = (l: { padre: string; clave: string; tipo: string }) => `${l.clave}: ${l.tipo}${l.padre ? ` @ ${l.padre}` : ''}`;
  const a = new Set(aplanar(esperado).map(fmt));
  const b = new Set(aplanar(observado).map(fmt));
  const eliminadas = [...a].filter((x) => !b.has(x)).sort();
  const nuevas = [...b].filter((x) => !a.has(x)).sort();
  // Un campo que antes era «number» y ahora «number|null» no rompe; se considera ampliación.
  const clave = (s: string) => s.replace(/: [^@]+/, '');
  // «array<null|number>» → ['array:null', 'array:number'] para comparar los tipos de los elementos.
  const tipos = (s: string) => {
    const t = (/: ([^@]+?)(?: @|$)/.exec(s)?.[1] ?? '').trim();
    const arr = /^array<(.*)>$/.exec(t);
    return arr ? arr[1].split('|').map((x) => `array:${x}`) : t.split('|');
  };
  const contiene = (a: string[], b: string[]) => b.every((t) => a.includes(t));
  // Tampoco rompe un estrechamiento («number|null» → «number»): todo valor nuevo cabe en el tipo esperado.
  const rompen = eliminadas.filter((x) => {
    const sustituta = nuevas.find((n) => clave(n) === clave(x));
    return !sustituta || !(contiene(tipos(sustituta), tipos(x)) || contiene(tipos(x), tipos(sustituta)));
  });
  const texto = [...eliminadas.map((x) => `- ${x}`), ...nuevas.map((x) => `+ ${x}`)].join('\n');
  return { eliminadas, nuevas, roto: rompen.length > 0, texto };
}

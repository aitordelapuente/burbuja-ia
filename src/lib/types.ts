// Modelo de datos del panel (sección 8 de la especificación).
export type Semaforo = 'verde' | 'ambar' | 'naranja' | 'rojo' | 'sin_dato';
export type Punto = { date: string; value: number }; // YYYY-MM-DD

export type ModuloId = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11';

export interface Indicador {
  id: string; // 'I01'…'I42', 'c1'…'c6'
  modulo: ModuloId;
  nombre: string;
  valor: number | null; // null = sin dato
  unidad: '%' | 'USD' | 'USD/h' | 'pp' | 'MUSD' | 'indice' | 'bool' | 'texto';
  valorTexto?: string; // ya formateado es-ES
  serie?: Punto[];
  /** Series adicionales con nombre (por ejemplo, umbral escalonado o una segunda línea). */
  series?: Record<string, Punto[]>;
  umbrales?: { verde: string; ambar: string; rojo: string; propuesto: boolean };
  semaforo: Semaforo;
  proximidad?: number | null; // 0-100
  ayuda: string;
  citaVideo?: { texto: string; t: number /* segundos */ };
  fuente: { nombre: string; url: string; manual: boolean; verificado: boolean };
  actualizadoEn: string | null; // ISO
  stale: boolean;
  /** Datos extra específicos del indicador (tablas, chips, notas). */
  extra?: Record<string, unknown>;
  /** Notas visibles (por ejemplo, «Dato del vídeo, sin verificar»). */
  notas?: string[];
}

export interface DetalleProveedor {
  ticker: string;
  nombre: string;
  papel: string;
  ath: number;
  athFecha: string;
  close: number;
  fecha: string;
  dd: number;
  umbral: number;
  distancia: number;
  proximidad: number;
  heredada: boolean;
  cumplidaDesde: string | null;
  fechaSuceso: string | null;
}

export type EstadoCondicion = 'cumplida' | 'muy_cerca' | 'vigilancia' | 'lejos' | 'sin_dato';

export interface Condicion extends Indicador {
  bloque: 'financiero' | 'real';
  estado: EstadoCondicion;
  cumplidaHoy: boolean | null;
  fechaSuceso: string | null;
  /** Todas las fechas de suceso (cruces) dentro del horizonte de evaluación. */
  sucesos: string[];
  heredada: boolean;
  cumplidaDesde?: string | null;
  recuperada?: boolean;
  precioUmbral?: number | null;
  distanciaRestante?: number | null; // fracción negativa: −0.047
  usaProxy?: boolean;
  enInvestigacion?: boolean;
  detalle?: DetalleProveedor[];
}

export interface HorizontePolymarket {
  slug: string;
  titulo: string;
  fin: string;
  probSi: number | null;
  volumen: number | null;
  serie: Punto[];
  cerrado: boolean;
  resultado?: 'Sí' | 'No' | null;
}

export type CodigoEscenario = 'PINCHAZO_PM' | 'E2' | 'E1' | 'E1_CONTAGIO' | 'MIXTO' | 'SIN';

export interface SaludConector {
  conector: string;
  ok: boolean;
  error?: string;
  fetchedAt: string;
  stale: boolean;
}

export interface Snapshot {
  generadoEn: string;
  hoy: string;
  condiciones: Condicion[]; // c1..c6
  ventana: {
    enVentana: string[];
    n: number;
    pinchazo: boolean;
    inicio: string | null;
    fin: string | null;
    limite: string; // '2026-12-31'
    sucesos: Array<{ cond: string; fecha: string }>;
  };
  indicadores: Record<string, Indicador>;
  irp: {
    valor: number | null;
    parcial: boolean;
    faltan: string[];
    F: number | null;
    R: number | null;
    P: number | null;
    semaforo: Semaforo;
    etiqueta: string;
    anulado: boolean;
    componentes: Record<string, number | null>;
  };
  escenario: { codigo: CodigoEscenario; titulo: string; evidencias: string[] };
  polymarket: {
    horizontes: HorizontePolymarket[];
    principal: string | null;
    reglasCambiadas: boolean;
    reglamento: string | null;
    resueltos: HorizontePolymarket[];
  };
  fraseDelDia: string;
  salud: SaludConector[];
}

export type ConnectorResult<T> =
  | { ok: true; data: T; source: string; fetchedAt: string /* ISO UTC */; stale?: boolean }
  | { ok: false; error: string; source: string; fetchedAt: string };

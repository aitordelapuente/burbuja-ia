// Tipos compartidos del investigador J2 (sección 18.3).
import { z } from 'zod';

export type Fichero =
  | 'nvidia'
  | 'eventos'
  | 'laboratorios'
  | 'frentes_nvidia'
  | 'financiacion_labs'
  | 'regulacion'
  | 'opv'
  | 'gpu_alquiler'
  | 'candidatos_c56'
  | 'polymarket_eventos';

export const RUTAS: Record<Fichero, string> = {
  nvidia: 'data/manual/nvidia.json',
  eventos: 'data/manual/eventos.json',
  laboratorios: 'data/manual/laboratorios.json',
  frentes_nvidia: 'data/manual/frentes_nvidia.json',
  financiacion_labs: 'data/manual/financiacion_labs.json',
  regulacion: 'data/manual/regulacion.json',
  opv: 'data/manual/opv.json',
  gpu_alquiler: 'data/manual/gpu_alquiler.csv',
  candidatos_c56: 'data/auto/candidatos_c56.json',
  polymarket_eventos: 'data/auto/polymarket_eventos.json',
};

/** Ficheros de «registro de eventos»: la misma URL se fusiona (18.3.4, paso 6). */
export const FICHEROS_EVENTO: Fichero[] = ['eventos', 'frentes_nvidia', 'regulacion', 'financiacion_labs', 'opv', 'candidatos_c56'];

/** Tipos de dato con rango plausible (tabla de 18.3.4, paso 7). */
export type TipoRango = 'h100' | 'b200' | 'ingresos_nvda' | 'prevision_nvda' | 'garantias_nvda' | 'ronda' | 'gravedad';

export const RANGOS: Record<TipoRango, { min: number; max: number; variacion: number | null }> = {
  h100: { min: 0.3, max: 20, variacion: 0.25 },
  b200: { min: 1, max: 40, variacion: 0.25 },
  ingresos_nvda: { min: 10_000, max: 400_000, variacion: 0.4 },
  prevision_nvda: { min: 10_000, max: 400_000, variacion: 0.4 },
  garantias_nvda: { min: 0, max: 500_000, variacion: 0.3 },
  ronda: { min: 100, max: 300_000, variacion: null },
  gravedad: { min: 1, max: 3, variacion: null },
};

export type CitaVerificada = 'pagina' | 'snippet';
export type TipoFuente = 'primaria' | 'medio' | 'otro';

/** Una propuesta (determinista o del LLM) antes de verificar. */
export interface Propuesta {
  tarea: string;
  fichero: Fichero;
  /** Item tal y como se escribirá (sin los campos comunes de J2, que añade run.ts). */
  item: Record<string, unknown>;
  fuente_url: string;
  cita: string;
  fecha_dato: string;
  fecha_publicacion?: string | null;
  tipo_fuente: TipoFuente;
  es_rumor?: boolean;
  es_desmentido?: boolean;
  /** Cifra que debe aparecer en la cita (null si el dato no es numérico). */
  valor: number | null;
  /** Valor que se comprueba contra el rango (por defecto, `valor`). */
  valorRango?: number | null;
  tipoRango?: TipoRango;
  /** Valor de referencia para la variación máxima (último valor conocido). */
  referencia?: number | null;
  /** Texto de la página ya descargado por el código (evita volver a pedirla). */
  textoPagina?: string;
  /** Fragmentos de `search_results[].snippet` de la propia respuesta del LLM para esa URL. */
  snippets?: string[];
  /** Clave exacta de duplicado (p. ej. «nvidia|FY2027Q3|guidance_musd»). */
  claveDup?: string;
  /** Agrupación para duplicados por fecha ±3 días (misma entidad y tipo). */
  grupoFecha?: string;
  /** Devuelve true si el item existente es el mismo dato. */
  duplicaA?: (existente: Record<string, unknown>) => boolean;
  modelo: string;
  /** Revisión forzada por la tarea (p. ej. gravedad asignada por regla). */
  revisionForzada?: string;
}

export interface Aceptado extends Propuesta {
  cita_verificada: CitaVerificada;
  requiere_revision: boolean;
  motivosRevision: string[];
  fuentesAdicionales?: Array<{ fuente_url: string; cita: string; cita_verificada: CitaVerificada }>;
}

export interface Descarte {
  tarea: string;
  fuente_url: string;
  motivo: string;
  cita?: string;
}

// ---------- Esquema de la respuesta del LLM (se convierte a JSON Schema para response_format) ----------

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha YYYY-MM-DD');

export const ItemLLM = z.object({
  fuente_url: z.string().url(),
  cita: z.string().min(40).max(400),
  titulo: z.string().min(3).max(300),
  fecha_dato: fechaIso,
  fecha_publicacion: fechaIso.nullable().optional(),
  tipo_fuente: z.enum(['primaria', 'medio', 'otro']),
  es_rumor: z.boolean(),
  es_desmentido: z.boolean().optional(),
  valor: z.number().nullable().optional(),
  entidad: z.enum(['OpenAI', 'Anthropic', 'Nvidia', 'otra']).nullable().optional(),
  tipo: z.enum(['quiebra', 'adquisicion_openai', 'otro']).nullable().optional(),
  gravedad: z.number().int().min(1).max(3).nullable().optional(),
  efecto: z.enum(['freno_cpd', 'exportacion', 'investigacion', 'otro']).nullable().optional(),
  ambito: z.enum(['EEUU', 'UE', 'otro']).nullable().optional(),
  frente: z.enum(['direccion', 'regulacion', 'financiacion']).nullable().optional(),
  tipo_financiacion: z.enum(['OPV', 'ronda', 'deuda']).nullable().optional(),
  empresa: z.string().max(120).nullable().optional(),
  estado_opv: z.enum(['completada', 'aplazada', 'retirada', 'prevista']).nullable().optional(),
  detalle: z.string().max(600).nullable().optional(),
});
export type ItemLLM = z.infer<typeof ItemLLM>;

export const RespuestaLLM = z.object({ items: z.array(ItemLLM).max(20) });

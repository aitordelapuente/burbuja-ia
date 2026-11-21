// Esquemas zod de las fuentes externas y de los ficheros manuales.
import { z } from 'zod';

// ---------- Yahoo chart v8 ----------
export const YahooChartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            symbol: z.string(),
            currency: z.string().nullable().optional(),
            exchangeTimezoneName: z.string(),
          }).passthrough(),
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({
            quote: z.array(z.object({ close: z.array(z.number().nullable()).optional() }).passthrough()),
          }).passthrough(),
        }).passthrough(),
      )
      .nullable(),
    error: z.unknown().nullable().optional(),
  }),
});
export type YahooChart = z.infer<typeof YahooChartSchema>;

// ---------- Polymarket ----------
const jsonString = <T extends z.ZodTypeAny>(inner: T) =>
  z.union([z.string(), z.array(z.any())]).transform((v, ctx) => {
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v;
      const r = inner.safeParse(parsed);
      if (!r.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JSON interno inválido' });
        return z.NEVER;
      }
      return r.data as z.infer<T>;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JSON interno no parseable' });
      return z.NEVER;
    }
  });

export const PolymarketMarketSchema = z.object({
  slug: z.string(),
  question: z.string().optional(),
  endDate: z.string().optional(),
  closed: z.boolean().optional(),
  outcomes: jsonString(z.array(z.string())),
  outcomePrices: jsonString(z.array(z.union([z.string(), z.number()]))).optional(),
  clobTokenIds: jsonString(z.array(z.string())).optional(),
  lastTradePrice: z.union([z.number(), z.string()]).optional().nullable(),
  volume: z.union([z.number(), z.string()]).optional().nullable(),
}).passthrough();
export const PolymarketEventsSchema = z.array(
  z.object({
    slug: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    markets: z.array(PolymarketMarketSchema),
  }).passthrough(),
);
export const PolymarketHistorySchema = z.object({
  history: z.array(z.object({ t: z.number(), p: z.number() })),
});

// ---------- SEC EDGAR companyconcept ----------
export const SecConceptSchema = z.object({
  cik: z.union([z.number(), z.string()]),
  tag: z.string(),
  units: z.record(
    z.array(
      z.object({
        start: z.string().optional(),
        end: z.string(),
        val: z.number(),
        fy: z.number().nullable().optional(),
        fp: z.string().nullable().optional(),
        form: z.string(),
        filed: z.string(),
        frame: z.string().optional(),
      }).passthrough(),
    ),
  ),
}).passthrough();

// ---------- Silicon Data ----------
export const SiliconDataSchema = z.object({
  data: z.object({ indexes: z.record(z.union([z.string(), z.number()])) }).passthrough(),
}).passthrough();

// ---------- Índice abierto (fuentes en vivo) ----------
export const RunpodSchema = z.object({
  data: z.object({
    gpuTypes: z.array(
      z.object({ id: z.string(), displayName: z.string(), securePrice: z.number().nullable(), communityPrice: z.number().nullable() }).passthrough(),
    ),
  }),
});
export const VastSchema = z.object({
  offers: z.array(z.object({ dph_total: z.number(), num_gpus: z.number() }).passthrough()),
}).passthrough();
export const AzureSchema = z.object({
  Items: z.array(z.object({ retailPrice: z.number(), armSkuName: z.string(), skuName: z.string().optional(), type: z.string().optional() }).passthrough()),
}).passthrough();

// ---------- Ficheros manuales ----------
const origen = z.enum(['J2', 'video', 'humano']).optional();
const comunes = {
  fuente_url: z.string().url().optional(),
  cita: z.string().optional(),
  cita_verificada: z.enum(['pagina', 'snippet']).optional(),
  origen,
  modelo: z.string().optional(),
  fecha_alta: z.string().optional(),
  fecha_dato: z.string().optional(),
  requiere_revision: z.boolean().optional(),
  caduca_en: z.string().optional(),
};
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const archivo = <T extends z.ZodTypeAny>(item: T) => z.object({ _ayuda: z.string(), items: z.array(item) }).strict();

export const EventosSchema = archivo(
  z.object({
    id: z.string(),
    fecha,
    tipo: z.enum(['quiebra', 'adquisicion_openai', 'otro']),
    entidad: z.enum(['OpenAI', 'Anthropic']),
    titulo: z.string(),
    ...comunes,
    fuente_url: z.string().url(),
    verificado: z.boolean(),
    regla: z.enum(['A', 'B']).optional(),
  }),
);
export const LaboratoriosSchema = archivo(
  z.object({ lab: z.enum(['OpenAI', 'Anthropic']), estado: z.enum(['normal', 'tension', 'evento']), nota: z.string(), fecha, verificado: z.boolean(), ...comunes }),
);
export const NvidiaSchema = archivo(
  z.object({
    ...comunes,
    trimestre: z.string(),
    fecha_dato: fecha.optional(),
    ingresos_musd: z.number().nullable(),
    crec_interanual: z.number().nullable(),
    guidance_musd: z.number().nullable().optional(),
    garantias_musd: z.number().nullable().optional(),
    garantia_mayor_musd: z.number().nullable().optional(),
    descripcion_garantia_mayor: z.string().optional(),
    acuerdos_circulares_declarados: z.boolean().optional(),
    nota_acuerdos: z.string().optional(),
    fuente: z.string(),
    verificado: z.boolean(),
  }),
);
export const FrentesSchema = archivo(
  z.object({
    fecha,
    frente: z.enum(['direccion', 'regulacion', 'financiacion']),
    titulo: z.string(),
    detalle: z.string(),
    ...comunes,
    fuente_url: z.string().url(),
    gravedad: z.number().int().min(1).max(3),
    verificado: z.boolean(),
  }),
);
export const FinanciacionSchema = archivo(
  z.object({
    lab: z.enum(['OpenAI', 'Anthropic']),
    fecha,
    importe_musd: z.number().nullable(),
    tipo: z.enum(['OPV', 'ronda', 'deuda']),
    nota: z.string(),
    verificado: z.boolean(),
    ...comunes,
  }),
);
export const RegulacionSchema = archivo(
  z.object({
    fecha,
    ambito: z.enum(['EEUU', 'UE', 'otro']),
    titulo: z.string(),
    efecto: z.enum(['freno_cpd', 'exportacion', 'investigacion', 'otro']),
    gravedad: z.number().int().min(1).max(3),
    verificado: z.boolean(),
    ...comunes,
  }),
);
export const OpvSchema = archivo(
  z.object({
    empresa: z.string(),
    ticker: z.string().optional(),
    fecha,
    precio_opv: z.number().nullable().optional(),
    importe_musd: z.number().nullable().optional(),
    estado: z.enum(['completada', 'aplazada', 'retirada', 'prevista']),
    verificado: z.boolean(),
    ...comunes,
  }),
);
export const GpuCsvFilaSchema = z.object({
  fecha,
  gpu: z.string().min(1),
  indice: z.string().min(1),
  usd_hora: z.number().min(0).max(100).nullable(),
  fuente: z.string(),
  verificado: z.boolean(),
});
export const GpuAbiertoFilaSchema = z.object({
  fecha,
  gpu: z.string().min(1),
  lectura: z.enum(['neo', 'hs']),
  valor: z.number().min(0).max(100),
  fuentes_usadas: z.string(),
  detalle_json: z.string(),
});
export const CandidatosSchema = z.object({ _ayuda: z.string(), items: z.array(z.record(z.unknown())) });
export const CitasSchema = z.object({
  _ayuda: z.string(),
  items: z.array(z.object({ t: z.number(), mmss: z.string(), afirmacion: z.string(), panel: z.string() })),
});
export const PuntocomSchema = z.object({
  _ayuda: z.string(),
  fibra: z.array(z.object({ anio: z.number(), usd_anio: z.number(), dudoso: z.boolean(), nota: z.string().optional(), t: z.number() })),
  demanda: z.array(z.object({ anio: z.number(), factor: z.number(), acumulado: z.number(), t: z.number() })),
  texto: z.string(),
  maximoNasdaq2000: fecha,
});
export const ComponentesSchema = z.object({
  _ayuda: z.string(),
  items: z.array(z.object({ ticker: z.string(), nombre: z.string(), papel: z.string() })),
});

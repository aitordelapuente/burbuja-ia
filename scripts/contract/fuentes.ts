// Fuentes vigiladas por J4 (sección 18.6): endpoint en vivo, conector afectado, esquema zod del conector
// (si existe) y fixture desde el que se genera el snapshot de esquema.
import type { ZodTypeAny } from 'zod';
import {
  AzureSchema,
  PolymarketEventsSchema,
  PolymarketHistorySchema,
  RunpodSchema,
  SecConceptSchema,
  SiliconDataSchema,
  VastSchema,
  YahooChartSchema,
} from '@/lib/schemas';
import { URLS as URLS_GPU } from '../collect/gpu-abierto';
import { urlFederalRegister } from '../research/tareas/regulacion';

export interface FuenteContrato {
  id: string;
  conector: string;
  url: string | (() => string);
  init?: () => RequestInit;
  formato: 'json' | 'csv';
  esquemaZod?: ZodTypeAny;
  /** Fixtures (relativos a la raíz) desde los que se regenera el snapshot; el primero que exista. */
  fixtures: string[];
  /** Ejemplo mínimo si no hay fixture. */
  ejemplo?: unknown;
  /** Solo si existe esta variable de entorno (p. ej. la clave de pago de Silicon Data). */
  requiere?: string;
  /** Recorta la respuesta antes de inferir (respuestas enormes). */
  recortar?: (datos: unknown) => unknown;
}

const ua = () => ({ 'user-agent': process.env.HTTP_USER_AGENT || 'Mozilla/5.0 (PanelPinchazoIA)' });
const uaSec = () => ({ 'user-agent': process.env.SEC_USER_AGENT || 'PanelPinchazoIA admin@example.com' });
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);

export const FUENTES: FuenteContrato[] = [
  {
    id: 'yahoo',
    conector: 'src/lib/connectors/yahoo.ts',
    url: () => `https://query1.finance.yahoo.com/v8/finance/chart/NVDA?period1=${Math.floor(Date.now() / 1000) - 30 * 86400}&period2=${Math.floor(Date.now() / 1000)}&interval=1d&events=split`,
    init: () => ({ headers: ua() }),
    formato: 'json',
    esquemaZod: YahooChartSchema,
    fixtures: ['tests/fixtures/yahoo/NVDA.json'],
  },
  {
    id: 'polymarket-gamma',
    conector: 'src/lib/connectors/polymarket.ts',
    url: 'https://gamma-api.polymarket.com/events?slug=ai-bubble-burst-by',
    init: () => ({ headers: ua() }),
    formato: 'json',
    esquemaZod: PolymarketEventsSchema,
    fixtures: ['tests/fixtures/polymarket/events-ai-bubble-burst-by.json'],
  },
  {
    id: 'polymarket-clob',
    conector: 'src/lib/connectors/polymarket.ts',
    // El token se toma en el test de la respuesta de Gamma; esta URL es la plantilla.
    url: 'https://clob.polymarket.com/prices-history?market={token}&interval=max&fidelity=1440',
    init: () => ({ headers: ua() }),
    formato: 'json',
    esquemaZod: PolymarketHistorySchema,
    fixtures: ['tests/fixtures/polymarket/history-1111111111111111111111111111111111111111111111111111111111111111.json'],
    recortar: (d) => ({ ...(d as object), history: ((d as { history?: unknown[] }).history ?? []).slice(-20) }),
  },
  {
    id: 'sec-companyconcept',
    conector: 'src/lib/connectors/sec.ts',
    url: 'https://data.sec.gov/api/xbrl/companyconcept/CIK0001045810/us-gaap/Revenues.json',
    init: () => ({ headers: uaSec() }),
    formato: 'json',
    esquemaZod: SecConceptSchema,
    fixtures: ['tests/fixtures/sec/Revenues.json'],
  },
  {
    id: 'sec-submissions',
    conector: 'scripts/research/sec.ts',
    url: 'https://data.sec.gov/submissions/CIK0001045810.json',
    init: () => ({ headers: uaSec() }),
    formato: 'json',
    fixtures: ['tests/maintenance/fixtures/sec-submissions-nvda.json'],
    recortar: (d) => ({ cik: (d as { cik?: unknown }).cik, name: (d as { name?: unknown }).name, filings: { recent: (d as { filings?: { recent?: unknown } }).filings?.recent } }),
  },
  {
    id: 'fred',
    conector: 'src/lib/connectors/fred.ts',
    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10',
    init: () => ({ headers: ua() }),
    formato: 'csv',
    fixtures: ['tests/fixtures/fred/DGS10.csv'],
  },
  {
    id: 'runpod',
    conector: 'scripts/collect/gpu-abierto.ts',
    url: URLS_GPU.runpod,
    init: () => ({
      method: 'POST',
      headers: { ...ua(), 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { gpuTypes { id displayName securePrice communityPrice } }' }),
    }),
    formato: 'json',
    esquemaZod: RunpodSchema,
    fixtures: ['tests/maintenance/fixtures/runpod.json'],
  },
  {
    id: 'vast',
    conector: 'scripts/collect/gpu-abierto.ts',
    url: () => URLS_GPU.vast('H100 SXM'),
    init: () => ({ headers: ua() }),
    formato: 'json',
    esquemaZod: VastSchema,
    fixtures: ['tests/maintenance/fixtures/vast-h100.json'],
  },
  {
    id: 'azure',
    conector: 'scripts/collect/gpu-abierto.ts',
    url: () => URLS_GPU.azure('Standard_ND96isr_H100_v5'),
    init: () => ({ headers: ua() }),
    formato: 'json',
    esquemaZod: AzureSchema,
    fixtures: ['tests/maintenance/fixtures/azure-h100.json'],
  },
  {
    id: 'aws',
    conector: 'scripts/collect/gpu-abierto.ts',
    url: URLS_GPU.aws,
    init: () => ({ headers: ua() }),
    formato: 'json',
    fixtures: ['tests/maintenance/fixtures/aws.json'],
    // Las claves de regions[región] son tipos de instancia (cientos en vivo): se convierten en una lista de muestra.
    recortar: (d) => {
      const o = d as { manifest?: unknown; regions?: Record<string, Record<string, unknown>> };
      return { manifest: o.manifest, regions: Object.fromEntries(Object.entries(o.regions ?? {}).map(([k, v]) => [k, Object.values(v).slice(0, 10)])) };
    },
  },
  {
    id: 'federalregister',
    conector: 'scripts/research/tareas/regulacion.ts',
    url: () => urlFederalRegister(hace(7)),
    init: () => ({ headers: ua() }),
    formato: 'json',
    fixtures: [],
    ejemplo: {
      count: 1,
      description: 'Documentos del Federal Register',
      total_pages: 1,
      results: [
        {
          title: 'Ejemplo mínimo',
          type: 'Rule',
          abstract: 'Resumen',
          document_number: '2026-00001',
          html_url: 'https://www.federalregister.gov/documents/2026/11/20/2026-00001/ejemplo',
          pdf_url: 'https://www.govinfo.gov/content/pkg/FR-2026-11-20/pdf/2026-00001.pdf',
          public_inspection_pdf_url: 'https://public-inspection.federalregister.gov/2026-00001.pdf',
          publication_date: '2026-11-20',
          agencies: [{ raw_name: 'X', name: 'X', id: 1, url: 'https://www.federalregister.gov/agencies/x', json_url: 'https://www.federalregister.gov/api/v1/agencies/1', parent_id: null, slug: 'x' }],
          excerpts: 'Extracto',
        },
      ],
    },
  },
  {
    id: 'silicondata',
    conector: 'src/lib/connectors/silicondata.ts',
    url: 'https://api.silicondata.com/api/gpu-index/index',
    init: () => ({
      method: 'POST',
      headers: { ...ua(), 'content-type': 'application/json', authorization: `Bearer ${process.env.SILICONDATA_API_KEY ?? ''}` },
      body: JSON.stringify({ gpu: 'h100', index_version: 'neo', starting_date: hace(10), ending_date: hace(0) }),
    }),
    formato: 'json',
    esquemaZod: SiliconDataSchema,
    fixtures: ['tests/fixtures/silicondata/h100.json'],
    requiere: 'SILICONDATA_API_KEY',
    // indexes es un mapa fecha → valor: se convierte en una lista de muestra para que no dependa del número de fechas.
    recortar: (d) => {
      const o = d as { data?: { indexes?: Record<string, unknown> } & Record<string, unknown> } & Record<string, unknown>;
      return { ...o, data: { ...o.data, indexes: Object.values(o.data?.indexes ?? {}).slice(0, 5) } };
    },
  },
];

export const urlDe = (f: FuenteContrato) => (typeof f.url === 'function' ? f.url() : f.url);

/** Claves de los fixtures sintéticos que no forman parte del contrato. */
export const ignorarClave = (k: string) => k.startsWith('_fixture');

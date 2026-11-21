// Parámetros centralizados (sección 11): símbolos, umbrales, pesos, fecha límite, slug y URLs.
// Los valores marcados como propuesto: true son «(P)» en la especificación (D11).

export const VIDEO = {
  id: 'JC5wHXu8f7I',
  url: 'https://www.youtube.com/watch?v=JC5wHXu8f7I',
  titulo: 'Pánico en la bolsa: ¿estamos ante el pinchazo de la IA?',
  canal: 'Juan Ramón Rallo',
  fecha: '2026-11-21',
};

export const urlVideo = (t: number) => `${VIDEO.url}&t=${Math.max(0, Math.round(t))}s`;

export const ZONA_MADRID = 'Europe/Madrid';
export const ZONA_BOLSA = 'America/New_York';

export const SIMBOLOS = {
  nasdaq: '^IXIC',
  nvda: 'NVDA',
  soxx: 'SOXX',
  sox: '^SOX',
  proveedores: ['TSM', 'ASML', 'AVGO', 'ANET', 'SMCI'],
  componentesSoxx: ['NVDA', 'AMD', 'AVGO', 'MRVL', 'INTC', 'MU', 'TSM', 'AMAT', 'LRCX', 'KLAC'],
  etfGlobal: 'SEMI.L',
  etfGlobalRespaldo: 'SEC0.DE',
  anthropic: 'ANT',
  ipo: 'IPO',
  tnx: '^TNX',
} as const;

export const TODOS_LOS_SIMBOLOS: string[] = Array.from(
  new Set([
    SIMBOLOS.nasdaq,
    SIMBOLOS.nvda,
    SIMBOLOS.soxx,
    SIMBOLOS.sox,
    ...SIMBOLOS.proveedores,
    ...SIMBOLOS.componentesSoxx,
    SIMBOLOS.etfGlobal,
    SIMBOLOS.etfGlobalRespaldo,
    SIMBOLOS.anthropic,
    SIMBOLOS.ipo,
    SIMBOLOS.tnx,
  ]),
);

export const PROVEEDORES: Record<string, { nombre: string; papel: string }> = {
  TSM: { nombre: 'TSMC', papel: 'Fabrica los chips' },
  ASML: { nombre: 'ASML', papel: 'Máquinas de litografía' },
  AVGO: { nombre: 'Broadcom', papel: 'Chips a medida y equipos de red' },
  ANET: { nombre: 'Arista', papel: 'Redes' },
  SMCI: { nombre: 'Supermicro', papel: 'Monta servidores' },
};

export const CONDICIONES = {
  umbralNvda: 0.5,
  umbralSoxx: 0.4,
  umbralProveedor: 0.5,
  c4PrecioMax: 1.0,
  c4DiasSeguidos: 5,
  ventanaDias: 90,
  horizonteDias: 120, // D6
  heredadaDias: 90, // D7
  /** Fecha límite por defecto si no hay mercado abierto en Polymarket (D5). */
  limitePorDefecto: '2026-12-31',
  estados: { muyCerca: 85, vigilancia: 60 },
};

export const POLYMARKET = {
  eventos: ['ai-bubble-burst-by'],
  slugPrincipal2026: 'ai-industry-downturn-by-december-31-2026-857',
  slugJunio2027: 'ai-bubble-burst-by-june-30-2027',
  gamma: 'https://gamma-api.polymarket.com/events?slug=',
  clob: 'https://clob.polymarket.com/prices-history',
  web: 'https://polymarket.com/event/ai-bubble-burst-by',
  saltoAnotacionPp: 20,
  umbrales: { verde: 0.2, rojo: 0.5, propuesto: true },
};

export const IRP = {
  pesosF: { c1: 1 / 3, c2: 1 / 3, c3: 1 / 3 },
  pesosR: { c4: 0.5, c5: 0.25, c6: 0.25 },
  pesosP: { I30: 0.25, I31: 0.2, I32: 0.2, I33: 0.2, I34: 0.15 },
  pesosGlobal: { F: 0.25, R: 0.5, P: 0.25 },
  bono: { min: 3.5, max: 5.5 },
  opvDivisor: 0.3,
  c4TendenciaDivisor: 0.5,
  bandas: [
    { hasta: 30, semaforo: 'verde', etiqueta: 'Sin pinchazo' },
    { hasta: 50, semaforo: 'ambar', etiqueta: 'Tensión' },
    { hasta: 70, semaforo: 'naranja', etiqueta: 'Pinchazo financiero / riesgo de contagio' },
    { hasta: 101, semaforo: 'rojo', etiqueta: 'Pinchazo' },
  ] as const,
};

export const ESCENARIOS = {
  fMin: 60,
  rMax: 25,
  rE2: 50,
  c4TendenciaE2: -0.25,
  divergencia: { financiero: 40, real: -20 },
};

/** Umbrales de indicadores (P salvo que se indique). */
export const UMBRALES = {
  I01: { ambar: -0.1, rojo: -0.2, propuesto: false },
  I02diaria: { ambar: -0.02, rojo: -0.04, propuesto: true },
  I02semanal: { ambar: -0.05, rojo: -0.1, propuesto: true },
  I03semanal: { ambar: -0.08, rojo: -0.15, propuesto: true },
  I13: { verde: 0.3, ambar: 0, propuesto: true },
  I14: { verde: 0.05, ambar: 0, propuesto: true },
  I15: { verde: 0.1, rojo: 0.25, propuesto: true },
  I16: { verde: 0.25, rojo: 0.5, propuesto: true },
  I20: { ambar: -0.15, rojo: -0.3, propuesto: true },
  I24: { ambarPrecio: 1.5, ambarTendencia: -0.25, verdeTendencia: -0.1, propuesto: true },
  I28: { opv: 83, rojo: 58.1, propuesto: true },
  I30: { ambar: 4.25, rojo: 4.75, propuesto: true },
  I32: { ambar: 0, rojo: -0.15, propuesto: true },
  I35: { financiero: 40, real: -20 },
  I40: { caida12m: -0.5 },
  gravedadDias: 180,
  rondasDias: 180,
};

export const FUENTES = {
  yahoo: { nombre: 'Yahoo Finance (chart v8, no oficial)', url: 'https://finance.yahoo.com/quote/' },
  fred: { nombre: 'FRED (Reserva Federal de St. Louis)', url: 'https://fred.stlouisfed.org/series/' },
  polymarket: { nombre: 'Polymarket', url: 'https://polymarket.com/event/ai-bubble-burst-by' },
  sec: { nombre: 'SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=10-Q' },
  silicondata: { nombre: 'Silicon Data SDH100RT', url: 'https://www.silicondata.com/products/silicon-index/h100' },
  gpuAbierto: { nombre: 'Índice abierto de alquiler (RunPod, Vast.ai, Azure, AWS)', url: 'https://github.com/' },
  manual: { nombre: 'Datos manuales del repositorio', url: VIDEO.url },
};

export const SEC = {
  cikNvda: '0001045810',
  cikAnthropic: '0002130357',
  base: 'https://data.sec.gov/api/xbrl/companyconcept/',
};

export const REVALIDATE = {
  yahoo: 900,
  polymarket: 900,
  fred: 21600,
  sec: 86400,
  silicondata: 21600,
  gpuAbierto: 21600,
};

export const CADUCIDAD = {
  /** días hábiles: stale → sin_dato para series de mercado */
  mercado: { stale: 5, sinDato: 10 },
};

export const DOMINIOS_PERMITIDOS = [
  'sec.gov', 'federalregister.gov', 'whitehouse.gov', 'commerce.gov', 'bis.gov', 'europa.eu', 'boe.es',
  'nvidia.com', 'openai.com', 'anthropic.com', 'silicondata.com',
  'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'cnbc.com', 'apnews.com', 'nytimes.com', 'theverge.com',
  'techcrunch.com', 'theinformation.com', 'axios.com', 'expansion.com', 'cincodias.elpais.com',
];

export const TEXTOS = {
  pie: 'Panel informativo. No es una recomendación de inversión. Fuentes: Yahoo Finance, FRED, Polymarket, SEC EDGAR, Silicon Data y datos manuales señalados.',
  sinDato: 'Sin dato. No mostramos estimaciones.',
  sinVerificar: 'Dato del vídeo, sin verificar',
  umbralPropuesto: 'umbral propuesto',
  titulo: 'Panel de control del pinchazo de la IA',
  subtitulo: 'Basado en el análisis de Juan Ramón Rallo (21/11/2026)',
};

export const env = {
  mock: () => process.env.MOCK_DATA === '1',
  userAgent: () => process.env.HTTP_USER_AGENT || 'Mozilla/5.0 (PanelPinchazoIA)',
  secUserAgent: () => process.env.SEC_USER_AGENT || 'PanelPinchazoIA admin@example.com',
  siliconKey: () => process.env.SILICONDATA_API_KEY || '',
  fredKey: () => process.env.FRED_API_KEY || '',
  /** Fecha «hoy» forzada (YYYY-MM-DD) para fixtures y tests. */
  hoy: () => process.env.PANEL_HOY || '',
};

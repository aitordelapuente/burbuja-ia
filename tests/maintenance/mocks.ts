// Manejadores msw de prueba para EDGAR, Perplexity (o cualquier proveedor compatible) y páginas de medios.
import { http, HttpResponse } from 'msw';
import { fixture, fixtureJson } from './helpers';

export const ACC_NVDA = '000104581026000201';
export const URL_CFO = `https://www.sec.gov/Archives/edgar/data/1045810/${ACC_NVDA}/q3fy27cfocommentary.htm`;
export const URL_ANT_8K = 'https://www.sec.gov/Archives/edgar/data/2130357/000213035726000045/ant-20261119.htm';

export function manejadoresSec(opciones: { antConQuiebra?: boolean } = {}) {
  const subAnt = fixtureJson<{ filings: { recent: Record<string, string[]> } }>('sec-submissions-ant.json');
  if (!opciones.antConQuiebra) subAnt.filings.recent.items = subAnt.filings.recent.items.map(() => '7.01');
  return [
    http.get('https://data.sec.gov/submissions/CIK0001045810.json', ({ request }) =>
      request.headers.get('user-agent') ? HttpResponse.json(fixtureJson('sec-submissions-nvda.json')) : new HttpResponse(null, { status: 403 }),
    ),
    http.get(`https://www.sec.gov/Archives/edgar/data/1045810/${ACC_NVDA}/index.json`, () => HttpResponse.json(fixtureJson('sec-index-nvda.json'))),
    http.get(URL_CFO, () => new HttpResponse(fixture('q3fy27cfocommentary.htm'), { headers: { 'content-type': 'text/html' } })),
    http.get('https://data.sec.gov/submissions/CIK0002130357.json', () => HttpResponse.json(subAnt)),
    http.get(URL_ANT_8K, () => new HttpResponse(fixture('ant-8k-1-03.htm'), { headers: { 'content-type': 'text/html' } })),
  ];
}

/** Respuesta de chat/completions con el contenido JSON dado (formato OpenAI/Perplexity). */
export function respuestaLLM(contenido: unknown, searchResults: Array<{ url: string; snippet?: string }> = []) {
  return {
    id: 'prueba',
    model: 'sonar-pro',
    choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(contenido) } }],
    usage: { prompt_tokens: 1200, completion_tokens: 300 },
    citations: searchResults.map((s) => s.url),
    search_results: searchResults,
  };
}

export function manejadorLLM(contenido: unknown, llamadas: unknown[] = [], searchResults: Array<{ url: string; snippet?: string }> = []) {
  return http.post('https://api.perplexity.ai/chat/completions', async ({ request }) => {
    llamadas.push(await request.json());
    return HttpResponse.json(respuestaLLM(contenido, searchResults));
  });
}

export const paginaMedio = (titulo: string, frase: string) =>
  `<!-- PÁGINA SINTÉTICA de prueba --><html><head><title>${titulo}</title></head><body><article><h1>${titulo}</h1><p>${frase}</p></article></body></html>`;

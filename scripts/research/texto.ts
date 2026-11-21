// Normalización de HTML y comprobaciones de citas y cifras (sección 18.3.4, pasos 3 y 4). Código determinista.

const ENTIDADES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", sbquo: "'",
  ldquo: '"', rdquo: '"', bdquo: '"', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  euro: '€', copy: '©', reg: '®', trade: '™', shy: '', zwnj: '', zwj: '',
};

/** Equivalente a html.unescape para las entidades habituales y todas las numéricas. */
export function desescaparHtml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : m;
    }
    const v = ENTIDADES[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

const BLOQUE = /<\/?(p|div|br|li|ul|ol|tr|td|th|table|h[1-6]|title|section|article|header|footer|blockquote)\b[^>]*>/gi;

/**
 * HTML → texto plano legible (sin scripts ni estilos, etiquetas sustituidas por espacios, espacios colapsados).
 * Las etiquetas de bloque se convierten en saltos de línea para poder cortar frases; normalizar() los colapsa.
 */
export function htmlATexto(html: string): string {
  const sinBloques = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(BLOQUE, ' \u0001 ')
    .replace(/<[^>]+>/g, ' ');
  return desescaparHtml(sinBloques)
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ ?\u0001 ?/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

/** Normalización para comparar citas: texto plano, comillas rectas, espacios colapsados y minúsculas. */
export function normalizar(textoOHtml: string): string {
  return htmlATexto(textoOHtml)
    .replace(/[‘’‚‛′´`]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** La cita normalizada es subcadena de la página normalizada. */
export function citaEnTexto(cita: string, pagina: string): boolean {
  const c = normalizar(cita);
  if (c.length < 10) return false;
  return normalizar(pagina).includes(c);
}

/** Interpretaciones numéricas de un token («130,000», «130.0», «1.234,5»…). */
function interpretaciones(token: string): number[] {
  const out = new Set<number>();
  const us = Number(token.replace(/,/g, ''));
  if (Number.isFinite(us)) out.add(us);
  const es = Number(token.replace(/\./g, '').replace(',', '.'));
  if (Number.isFinite(es)) out.add(es);
  return [...out];
}

const ESCALAS = [1, 1e-3, 1e3, 1e-6, 1e6, 100, 0.01];

/**
 * El número del campo aparece en la cita, en cualquier formato y escala habitual
 * (130.000 M$ ↔ «$130.0 billion»; 1,03 ↔ «103%»).
 */
export function cifraEnCita(valor: number, cita: string): boolean {
  if (!Number.isFinite(valor)) return false;
  const tokens = cita.match(/\d[\d.,]*\d|\d/g) ?? [];
  for (const t of tokens) {
    for (const n of interpretaciones(t)) {
      for (const k of ESCALAS) {
        const objetivo = valor * k;
        if (Math.abs(n - objetivo) <= Math.max(1e-9, Math.abs(objetivo) * 1e-6)) return true;
      }
    }
  }
  return false;
}

/** Frase completa que contiene [inicio, fin) dentro del texto plano (para usarla como cita literal). */
export function fraseAlrededor(texto: string, inicio: number, fin: number, max = 400): string {
  let a = inicio;
  while (a > 0 && texto[a - 1] !== '\n' && !/[.!?]\s/.test(texto.slice(a - 2, a))) a--;
  let b = fin;
  while (b < texto.length && texto[b] !== '\n' && !/[.!?](\s|$)/.test(texto.slice(b, b + 2))) b++;
  const frase = texto.slice(a, Math.min(texto.length, texto[b] === '\n' ? b : b + 1)).trim();
  if (frase.length <= max) return frase;
  return texto.slice(inicio, fin).trim();
}

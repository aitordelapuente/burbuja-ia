/** Traducción fija del reglamento de Polymarket (sección 4.2 de la especificación). */
export const REGLAMENTO_ES = {
  intro:
    'El mercado se resuelve como «Sí» si al menos tres de los siguientes sucesos ocurren dentro de una misma ventana de 90 días que termine, como tarde, en la fecha límite del mercado (31/12/2026, 23:59 hora del Este de EE. UU.). En caso contrario, se resuelve como «No».',
  condiciones: {
    c1: 'NVDA cierra un 50 % o más por debajo de su máximo histórico de cierre.',
    c2: 'SOXX (iShares Semiconductor ETF) cierra un 40 % o más por debajo de su máximo histórico de cierre.',
    c3: 'TSMC, ASML, Broadcom, Arista o Supermicro cierra un 50 % o más por debajo de su máximo histórico de cierre (cuenta como un solo suceso).',
    c4: 'El índice de alquiler de la H100 de Silicon Data (SDH100RT) se sitúa en 1 $/hora o menos durante 5 días consecutivos publicados.',
    c5: 'OpenAI o Anthropic se declaran en quiebra.',
    c6: 'OpenAI es adquirida.',
  } as Record<string, string>,
  nota: 'Traducción orientativa. Prevalece el texto original en inglés publicado por Polymarket.',
};

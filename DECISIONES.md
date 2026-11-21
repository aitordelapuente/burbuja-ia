# Decisiones del constructor

Decisiones tomadas durante la construcción donde la especificación (v1.1) no decía nada, era ambigua o se ha ajustado. Las decisiones D1-D22 de la sección 15 se aplican tal cual salvo lo indicado aquí.

## Datos y cálculos

1. **Distancia restante** = `precioUmbral / close − 1`. La sección 4.1 escribe `close / precioUmbral − 1`, pero esa fórmula da +4,9 % para NVDA, mientras que el ejemplo y el test exigen −4,71 % («la caída adicional que falta»). Se usa la fórmula que reproduce el ejemplo.
2. **Heredada (D6 frente a D7).** Una condición es «heredada» si se cumple hoy y su tramo cumplido empezó antes de hoy − 90 días (D7). Ese cruce no cuenta. Los demás cruces de los últimos 120 días (D6) sí cuentan para la ventana. El primer punto de una serie, si ya se cumple, no es un cruce observado.
3. **Ventana.** Se busca la ventana de ≤ 90 días naturales (que termina ≤ fecha límite) con más condiciones distintas; a igualdad, la más reciente. N es ese número.
4. **Proximidad de c3** = la máxima de los proveedores no heredados. Su fecha de suceso es la primera de cruce dentro del horizonte.
5. **c4 sin clave de Silicon Data:** la serie oficial sale de `data/manual/gpu_alquiler.csv`. Si hay dos valores el mismo día, prevalece el `verificado:true` (3,08 frente al 3,1 del vídeo). La fila de diciembre de 2025 queda vacía (cifra inaudible) y no se interpola.
6. **c4 Δ90d** sin un dato de hace 90 días = sin tendencia (0 en el IRP), no se estima.
7. **I25 (anomalía)** necesita un dato de hace 12 meses o de diciembre de 2025; sin él queda «sin dato».
8. **I40** se calcula como la caída del último valor frente al máximo de 12 meses (≤ −50 % → patrón puntocom).
9. **I20**: se excluyen las últimas 63 sesiones al buscar el «último r42 inferior al actual», para no compararse con el propio episodio.
10. **I24b en la app** lee el histórico de `data/auto/gpu_alquiler_abierto.csv` (lo escribe J1 cada 6 h por PR). La app no llama a RunPod, Vast, Azure ni AWS desde Vercel: así no se multiplican peticiones y el dato tiene un único origen trazable.
11. **I19 semáforo** (no definido): ámbar si la caída es sectorial (|brecha| < 10 pp), verde si está concentrada.
12. **I29**: ámbar si no hay rondas en 180 días (la especificación solo define el rojo).
13. **I34 y frentes**: gravedad 3 → rojo; 1-2 → ámbar; sin eventos → verde.
14. **Caducidad de series de mercado:** se aplica la tabla 18.1 (Yahoo: stale a los 2 días hábiles, sin dato a los 5), que sustituye a la regla general de la sección 13.
15. **Fecha «hoy»:** la de la bolsa (America/New_York). En modo simulado es el 21/11/2026 (o `PANEL_HOY`).
16. **Último dato válido:** se guarda con `unstable_cache` (etiquetas `{conector}` y `snapshot-{conector}`) y, como segunda capa, en memoria de la instancia. Si la fuente falla se sirve con `stale:true`.
17. **Silicon Data sin clave** no cuenta como fallo en `/api/health` (es opcional).

## Fixtures

18. El entorno de construcción no tenía red hacia Yahoo, Polymarket, FRED ni SEC (el proxy lo bloqueaba). Los fixtures se **sintetizan** con `tests/fixtures/generar.ts`, anclados a los valores verificados de las secciones 4.2 y 6.3; entre anclas, la trayectoria es interpolada con ruido determinista. Algunos valores sin cifra en la especificación (ANT, componentes del SOXX, trimestres intermedios de Nvidia) son **de prueba**. Solo se usan con `MOCK_DATA=1`, y entonces la interfaz muestra la franja «Modo simulado: datos de prueba».

## Mantenimiento (ajustes de seguridad)

19. **Ningún bot aprueba ni mergea cambios que requieren revisión.** Los PR de c5/c6 siempre quedan en `revision-humana`; la regla B solo etiqueta y comenta. `C56_AUTOMERGE_TIMEOUT_H` no se implementa.
20. **Sin agente de autorreparación en J4:** J4 abre un issue con el diff del contrato roto; el arreglo lo hace una persona.
21. **No se cierran PR automáticamente:** los `revision-humana` antiguos se reportan en J3.
22. El único automerge es el nativo de GitHub tras CI verde, para PR de datos de bajo riesgo (solo altas, cita verificada en página, en rango, sin c5/c6 ni gravedad 3) y Renovate patch/minor.
23. **IA del investigador configurable:** en vez de fijar Perplexity, el cliente es compatible con la API de OpenAI (`RESEARCH_API_URL`, `RESEARCH_API_KEY`, `RESEARCH_MODEL`). Por defecto apunta a Perplexity `sonar-pro`. Si el proveedor no busca en la web, el LLM solo extrae datos del texto que le pasa el código.
24. **Automerge de J1:** solo si cambian filas del día, en 0,3-40 $/h y con una variación de ±25 % como mucho (reemplazar la fila del mismo día cuenta como alta).
25. **Pasan siempre a revisión humana:** `candidatos_c56.json` (más estricto que la 18.3.6), las actualizaciones de snapshots de esquema de J4, Renovate pin/digest/major/0.x y el mantenimiento del lockfile. Se quitó la regla de Renovate que mergeaba todas las GitHub Actions (habría incluido majors).
26. **CI en PR de bots:** los PR creados con `GITHUB_TOKEN` no disparan CI. Con un secreto `BOT_TOKEN` (GitHub App o PAT fine-grained) se disparan solos; sin él, J1 y J2 lanzan `ci.yml` por `workflow_dispatch` sobre la rama del PR.
27. **IAA:** se cuentan proveedores, no lecturas (RunPod solo, con sus dos precios, es una fuente → sin dato). IAA_hs exige Azure y AWS.
28. **Eventos de Polymarket descubiertos** se guardan en `data/auto/polymarket_eventos.json` (no en `config.ts`) y la app los une a `POLYMARKET.eventos`.
29. **Nvidia:** si conviven la semilla del vídeo y un dato de J2 del mismo trimestre, prevalece el verificado; si XBRL publica ese trimestre, manda XBRL y se avisa si difiere más de un 1 % (`I13.extra.avisoXbrl`).
30. **CODEOWNERS** protege también `laboratorios.json`, `candidatos_c56.json`, `.github/`, `renovate.json` y los clasificadores de los jobs. Hay que sustituir `@PROPIETARIO` por la cuenta real.
31. **Sin IA con búsqueda web**, el investigador solo extrae de documentos que descarga el código; `opv` y la financiación de OpenAI no producen datos en ese modo.

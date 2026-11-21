# Panel de control del pinchazo de la IA — Especificación para construcción autónoma

> Versión 1.1 · 21/11/2026 · Documento autocontenido. **Novedad 1.1:** el mantenimiento también es automático (sección 18): tabla consolidada de datos, recolector de precios de GPU gratuitos, investigador con LLM que abre PR con fuente y cita verificada, monitorización con alertas, autorreparación de contratos de API, ciclo de vida, Renovate, CI y despliegue continuo. La v1.0 se conserva en `ESPECIFICACION_v1.0.md`. Un LLM constructor (agente de código) debe poder construir, probar y desplegar la aplicación **sin hacer ninguna pregunta**. Si algo no está especificado, aplica la sección **«15. Decisiones ya tomadas»** y, si tampoco está ahí, elige la opción más simple que cumpla los criterios de aceptación y déjala anotada en `DECISIONES.md`.

---

## 0. Origen y alcance

**Vídeo fuente (única fuente de contenido del panel):**

- Título: *Pánico en la bolsa: ¿estamos ante el pinchazo de la IA?*
- Canal: Juan Ramón Rallo
- Publicado: 21/11/2026
- Duración: 24:33
- URL: https://www.youtube.com/watch?v=JC5wHXu8f7I
- Transcripción con marcas de tiempo: `transcripcion.txt` (subtítulos automáticos en español; tiene errores de reconocimiento que se corrigen en el Apéndice B).

**Tesis del vídeo, en una frase:** lo que está pinchando es la **valoración bursátil** de parte de la industria de la IA (Nvidia, semiconductores), no la **economía real** de la IA (alquiler de GPU al alza, laboratorios muy financiados). El panel debe medir esa divergencia y vigilar si la crisis financiera acaba contagiando a la economía real (escenario 2, como en la burbuja puntocom con la fibra óptica).

**Qué es el panel:**
1. Una aplicación web de una sola página principal, más páginas de detalle, en español.
2. Reproduce y sigue en tiempo casi real **los seis criterios con los que Polymarket define el «pinchazo de la burbuja de la IA»**, que son el eje del vídeo.
3. Añade los indicadores de contexto que el vídeo usa para interpretarlos: Nvidia y sus tres frentes, el sector de semiconductores, el alquiler de GPU, los laboratorios, los tipos de interés, la ventana de salidas a bolsa, la regulación y la comparación con la burbuja puntocom.
4. Calcula un **Índice de Riesgo de Pinchazo (IRP)** y un **diagnóstico de escenario** (escenario 1: corrección financiera; escenario 2: la bolsa anticipa el ajuste real).

**Qué NO es:**
- No es asesoramiento financiero. Pie fijo en todas las páginas: «Panel informativo. No es una recomendación de inversión.»
- No incluye la mención publicitaria del vídeo (Freedom24). El ETF citado (iShares MSCI Global Semiconductors) se incluye solo como serie de referencia, sin enlaces de afiliado.

---

## 1. Usuarios y casos de uso

- **Usuario principal:** directivo de marketing en una consultora tecnológica española (no es analista financiero). Necesita entender en 30 segundos si «la burbuja de la IA ha pinchado», y por qué.
- **CU1 — Vistazo:** abre la portada y ve: semáforo global, condiciones cumplidas (X/6), probabilidad de Polymarket, diagnóstico de escenario y la frase de lectura del día.
- **CU2 — Comprender:** pulsa una condición y ve la serie, el umbral, la distancia que queda y el texto explicativo del vídeo.
- **CU3 — Actualizar datos manuales:** edita un JSON del repositorio (por ejemplo, el precio del alquiler de la H100 si no hay clave de API, o un evento como «quiebra de OpenAI») y, al hacer commit, se redespliega.
- **CU4 — Compartir:** cada módulo tiene un enlace profundo (`/#condiciones`, `/condicion/c1`, etc.) y una vista imprimible.

---

## 2. Inventario del vídeo (lo que el panel debe cubrir)

Las marcas de tiempo son aproximadas (mm:ss). Las cifras son las del vídeo, ya corregidas con los datos de mercado verificados el 21/11/2026 (ver Apéndice B).

### 2.1 Termómetro del mercado (00:00–01:20)
- Nasdaq: −5,3 % el viernes 20/11/2026 en una sola sesión, más de −10 % en la semana y casi −20 % desde máximos («entrar técnicamente en un mercado bajista»). Verificado: −5,3 % / −10,0 % / −18,1 % (máximo de cierre 27.599,79 el 06/10/2026).
- Nvidia: −22 % en la semana (verificado −22,9 %), más de 1 billón de dólares de capitalización perdido en la semana, y casi −50 % desde máximos.
- Polymarket: la probabilidad de pinchazo antes de que acabe 2026 se dispara por encima del 50 % en un solo día (precio del «Sí» de 55 céntimos = 55 %). El vídeo contrasta esto con los horizontes de 2027 y 2028.

### 2.2 Cómo funciona Polymarket (01:26–03:22)
- Mercado de predicciones: el contrato paga 1 $ si ocurre el suceso y 0 si no. El precio es igual a la probabilidad implícita.
- Para resolverlo, los sucesos deben estar parametrizados sin ambigüedad.

### 2.3 Las seis condiciones (03:24–05:29)
El pinchazo se produce si se cumplen **al menos 3 de 6 sucesos dentro de una misma ventana de 90 días**, que debe terminar antes del 31/12/2026:
1. NVDA cierra un 50 % por debajo de su máximo histórico.
2. SOXX (iShares Semiconductor ETF, el «Sox» del vídeo) cierra un 40 % por debajo de su máximo histórico.
3. TSMC, ASML, Broadcom, Arista o Supermicro cierra un 50 % por debajo de su máximo histórico.
4. El alquiler de la H100 según el índice de Silicon Data cae a 1 $/hora o menos durante 5 días seguidos.
5. Quiebra OpenAI o Anthropic.
6. Alguien adquiere OpenAI.

El vídeo agrupa las condiciones en dos bloques: **financieras (1-3)**, que «están muy cerca de cumplirse», y **reales (4-6)**, que «están muy lejos».

### 2.4 Nvidia (05:29–09:23)
- Máximo histórico de cierre: 239,24 $ el 06/10/2026. Cierre del 20/11/2026: 125,53 $ (−47,5 %). Umbral: 119,62 $, a solo un −4,7 % adicional («solo tiene que ceder un 5 %»).
- Resultados del martes 17/11/2026: ingresos trimestrales de 115.800 M$ (+103 % interanual) y previsión de 130.000 M$ para el siguiente trimestre. Aun así, la acción cae porque el mercado duda de las ventas futuras.
- **Tres frentes abiertos:**
  - **Dirección:** salida de Jensen Huang tras el escándalo «Megaspeed»; ahora hay una nueva consejera delegada.
  - **Regulación:** la SEC tiene dos investigaciones, una civil (¿engañó a los inversores?) y otra sobre prácticas contables. No hay ninguna irregularidad probada. Los temas de fondo son China y la financiación a clientes.
  - **Financiación a clientes:** garantías de hasta 118.000 M$, de las que 105.000 M$ respaldan un único campus de centros de datos en Ohio alquilado a OpenAI durante 20 años. Además, hay acuerdos circulares con neoclouds (Nvidia les vende infraestructura y se compromete a comprarles servicios de nube): «Nvidia ha actuado como un banco». La nueva CEO anunció que va a «reevaluar con rigor» esas prácticas, lo que dejaría sin financiación a parte de sus clientes.

### 2.5 Semiconductores (09:23–12:41)
- SOXX: 30 mayores empresas de semiconductores cotizadas en EE. UU., con un tope de peso de alrededor del 8 %, de modo que Nvidia pesa más o menos lo mismo que AMD, Intel o Micron. Por eso mide «si la caída es cosa de una empresa o de todo el sector». Componentes citados: Nvidia, AMD, Broadcom, Marvell, Intel, Micron, TSMC, Applied Materials, Lam Research y KLA.
- Máximo de cierre: 218,34 $ el 22/06/2026. Umbral: 131 $. Cierre del 20/11: 123,40 $ (−43,5 %). **Es la primera condición cumplida.**
- Ha caído alrededor del 35 % en dos meses (verificado −34,6 % en 42 sesiones), un desplome que solo se superó en septiembre de 2001 (puntocom). En el cierre del vídeo: «peor racha desde 2001».
- ETF global citado: iShares MSCI Global Semiconductors UCITS ETF (ISIN IE000I8KRLL9, unas 260 empresas de mercados desarrollados y emergentes y de todos los tamaños). Su caída es similar a la del SOXX.

### 2.6 Proveedores de hardware (12:41–14:36)
- Funciones: TSMC fabrica los chips; ASML hace las máquinas de litografía; Broadcom diseña chips a medida y equipos de red; Arista hace redes; Supermicro monta servidores.
- Caídas desde máximos: Broadcom −37 %, ASML −36 %, TSMC −34 % y Arista −23 %. Broadcom es la más cercana: cerró el viernes en 305 $ y su umbral es de 241 $. El vídeo no da la cifra de Supermicro (ver la sección 16, «Huecos»).
- Balance financiero: 1 condición cumplida (SOXX), 1 cerca (NVDA) y 1 no cumplida pero plausible (Broadcom). «A nadie le sorprendería».

### 2.7 Alquiler de GPU (14:36–16:42)
- Es «probablemente el indicador más significativo de los seis»: mide directamente la economía real («lo que se paga hora a hora por usar los chips»). Si hubiera exceso de capacidad, sería el primer precio en hundirse.
- H100: 3,1 $/h el viernes (Silicon Data publica 3,08 $ a 20/11/2026), frente a 2,88 $ hace un mes y unos 2 $ en diciembre de 2025 (cifra poco audible). Es decir, más de un +50 % en 11 meses.
- Anomalía: la H100 ya no es el chip más avanzado y lo normal sería que se abaratara (como un ordenador antiguo), pero se encarece. La B200 (Blackwell) cuesta casi 10 $/h.
- Causa: la demanda de cómputo crece más deprisa que la capacidad. Aquí no hay pinchazo; la demanda final es «extraordinaria».

### 2.8 Laboratorios (16:42–18:31)
- Quiebra de OpenAI o Anthropic: «nada verosímil» antes de fin de año. Los laboratorios son los que alquilan casi toda la capacidad.
- Anthropic acaba de salir a bolsa a 83 $ por acción y ha captado más de 81.000 M$. OpenAI ha captado decenas de miles de millones en 2026.
- Hay fragilidades de fondo en sus arquitecturas financieras (el canal tiene un vídeo previo sobre Anthropic).
- Adquisición de OpenAI = «venta de urgencia». Es «altísimamente improbable».
- Resultado partido: se hunden en bolsa los fabricantes de chips, mientras la economía real de quienes los alquilan es sólida y el alquiler sube.

### 2.9 Escenario 1: pánico o corrección financiera (18:31–20:39)
- Si sobrara capacidad, veríamos chips ociosos y alquileres a la baja. No es así.
- Lo que ha empeorado es el entorno financiero:
  - la Reserva Federal está subiendo tipos;
  - el bono a 10 años ronda el 5 %;
  - Nvidia se repliega como financiadora;
  - se estrecha la ventana de salidas a bolsa;
  - la victoria demócrata en las elecciones de mitad de mandato aumenta el temor a que se frene la construcción de centros de datos.
- Todo ello rebaja el valor presente de la inversión futura en IA y el de los fabricantes de chips, pero no la utilidad de los chips instalados. Si en el futuro hay escasez de chips (por falta de financiación o por mala regulación), el cómputo actual vale más.
- Conclusión: como mucho, pinchazo de una burbuja **financiera**, es decir, valoraciones infladas que se ajustan. No hay una realidad depresiva, recesiva ni languideciente.

### 2.10 Escenario 2: la bolsa anticipa el ajuste (20:39–22:11)
- El alquiler refleja la escasez de hoy sobre los chips ya instalados; la bolsa descuenta lo que pasará cuando entre en funcionamiento toda la capacidad que está en camino.
- Precedente puntocom: el Nasdaq empieza a hundirse en marzo de 2000 y el precio de la fibra se desploma después. Un enlace de alta capacidad Los Ángeles–Nueva York costaba 1,8 M$ al año en 2000, 590.000 $ en 2001 y «4.000 $» en 2002 (cifra dudosa en el audio). La demanda no dejó de crecer: el ancho de banda contratado en cables submarinos se triplicó en 2000 y otra vez en 2001. Pero la capacidad creció aún más deprisa y quebraron constructoras como Global Crossing.

### 2.11 Retroalimentación financiero → real (22:11–22:59)
- Lo real se nutre de lo financiero: buena parte de la demanda de chips la pagan laboratorios que pierden dinero y dependen de financiación. Si esta se encarece o se cierra, comprarán menos cómputo y caerán la demanda y el precio del alquiler. En ese caso, lo financiero no habrá anticipado el pinchazo real, sino que lo habrá provocado.

### 2.12 Balance (22:59–24:33)
- Hoy la mayoría de los datos apuntan al escenario 1, con caídas por la subida de tipos y por la posible sobrerregulación desde Washington. No se descarta el escenario 2 antes de fin de año.
- Lo que pincha es la valoración: casi 3 billones de dólares evaporados solo en Nvidia desde máximos, y la peor racha de los semiconductores desde 2001.
- La revolución de la IA es «cada vez más innegable». Queda por ver si están justificados los precios y la estructura de mercado.

---

## 3. Arquitectura de la información (pantallas)

Ruta `/` (portada, scroll vertical, con secciones ancladas en este orden):

| # | Ancla | Módulo | Contenido principal |
|---|---|---|---|
| M0 | `#resumen` | Cabecera y veredicto | IRP global con semáforo, X/6 condiciones en ventana, probabilidad de Polymarket, diagnóstico de escenario, frase del día y hora de la última actualización |
| M1 | `#termometro` | Termómetro del mercado | Nasdaq, NVDA, SOX/SOXX: variación diaria, semanal y desde máximos; capitalización perdida por NVDA |
| M2 | `#polymarket` | Probabilidad de mercado | Probabilidad «Sí» 2026 y junio de 2027, histórico, explicación del contrato |
| M3 | `#condiciones` | Las 6 condiciones de Polymarket | 6 tarjetas en dos bloques (Financiero / Real), cada una con distancia al umbral, estado y fecha de cumplimiento; línea temporal de la ventana de 90 días |
| M4 | `#nvidia` | Nvidia: resultados y tres frentes | Ingresos, crecimiento, previsión, garantías y concentración; registro de frentes (dirección, regulación, financiación) |
| M5 | `#semis` | Sector de semiconductores | SOXX vs NVDA, peor racha en 42 sesiones desde 1994 (^SOX), ETF global, composición |
| M6 | `#proveedores` | Proveedores de hardware | Tabla de los 5 proveedores con máximo, cierre, caída, precio umbral y distancia |
| M7 | `#computo` | Economía real: alquiler de GPU | H100 (SDH100RT), variación a 30 días e interanual, umbral de 1 $, B200 y otras GPU, «anomalía de depreciación» |
| M8 | `#laboratorios` | Laboratorios (OpenAI, Anthropic) | Estado (normal, tensión o evento), financiación captada, cotización de Anthropic (ANT), registro de eventos |
| M9 | `#financiacion` | Condiciones financieras y políticas | Bono a 10 años, tipos de la Fed, ventana de OPV (ETF IPO), repliegue de Nvidia como financiadora, riesgo regulatorio |
| M10 | `#escenarios` | Escenarios y diagnóstico | Escenario 1 frente a escenario 2, con las reglas, la evidencia a favor y en contra y el mecanismo de retroalimentación |
| M11 | `#puntocom` | Comparación con la burbuja puntocom | Nasdaq 2000 frente a Nasdaq actual alineados en el máximo; precio de la fibra frente a la demanda; Global Crossing |
| M12 | `#metodologia` | Metodología y fuentes | Cálculo del IRP, umbrales, fuentes, salud de los conectores, limitaciones y enlace al vídeo |

Rutas adicionales:

- `/condicion/[id]` (id = c1…c6): detalle de una condición.
- `/indicador/[id]`: detalle de cualquier indicador del catálogo (sección 5).
- `/trazabilidad`: tabla del Apéndice A renderizada.
- `/api/snapshot` (GET, JSON): snapshot completo.
- `/api/health` (GET): estado de los conectores.
- `/api/cron/refresh` (GET, protegido): refresco.

---

## 4. Las seis condiciones: lógica exacta

### 4.1 Definiciones comunes

- **Máximo histórico (ATH):** el máximo de los **cierres diarios** (`close` sin ajustar por dividendos pero sí por splits, que es lo que devuelve el campo `close` de Yahoo chart v8) desde el inicio de la serie y **hasta la fecha d inclusive**. Se usa siempre el cierre, nunca el máximo intradía.
- **Caída desde el máximo:** `dd(d) = close(d) / ATH(d) − 1`, expresada en % negativo.
- **Precio umbral:** `ATH × (1 − u)`, donde u = 0,50 para NVDA y los proveedores, y u = 0,40 para SOXX.
- **Distancia restante:** `close / precioUmbral − 1`; es decir, la caída adicional que falta (por ejemplo, NVDA −4,7 %).
- **Proximidad (0-100):** `clamp(|dd| / u, 0, 1) × 100`.
- **Cumplida en el día d:** `close(d) ≤ precioUmbral(d)`.
- **Fecha de suceso (evento):** el primer día d en que la condición pasa de no cumplida a cumplida (un **cruce**). Si una condición está cumplida de forma continua desde antes del inicio del horizonte de evaluación (más de 90 días antes de hoy), se marca como **«cumplida heredada»**. Se muestra con una nota, pero **no cuenta** para la ventana, salvo que vuelva a cruzar. Esta regla resuelve el caso de Supermicro (SMCI está alrededor de un −80 % desde su máximo de marzo de 2024; el vídeo no la cuenta). Ver la sección 15, D7.
- **Ventana de 90 días:** el pinchazo, según el criterio de Polymarket, se da si existen 3 fechas de suceso de condiciones **distintas** cuyo rango (máx − mín) es ≤ 90 días naturales y cuya última fecha es ≤ la fecha límite del mercado (31/12/2026 23:59 ET). El grupo C3 cuenta como **una sola** condición aunque caigan varios proveedores. Se usa su primera fecha de cruce dentro del horizonte.
- **Condición «vigente»:** para las de precio, la que tiene un suceso en los últimos 90 días, tanto si sigue cumplida como si se ha recuperado. Ambas situaciones se muestran: «Cumplida (sigue)» o «Se cumplió el dd/mm (recuperada)».

### 4.2 Tabla de condiciones

| id | Bloque | Condición | Serie | Regla | Valor a 20/11/2026 (verificado) |
|---|---|---|---|---|---|
| c1 | Financiero | NVDA −50 % desde el ATH | Yahoo `NVDA` | close ≤ 0,5 × ATH | 125,53 $; ATH 239,24 $ (06/10/2026); −47,5 %; umbral 119,62 $ |
| c2 | Financiero | SOXX −40 % desde el ATH | Yahoo `SOXX` | close ≤ 0,6 × ATH | 123,40 $; ATH 218,34 $ (22/06/2026); −43,5 %; umbral 131,00 $ → **CUMPLIDA** |
| c3 | Financiero | Algún proveedor −50 % | Yahoo `TSM`, `ASML`, `AVGO`, `ANET`, `SMCI` | cualquiera con close ≤ 0,5 × ATH (con cruce no heredado) | AVGO −36,8 % (304,41 $; umbral 240,79 $); ASML −36,4 %; TSM −34,4 %; ANET −22,7 %; SMCI −81,8 % (heredada) |
| c4 | Real | H100 ≤ 1 $/h durante 5 días seguidos | Silicon Data SDH100RT (neo) | 5 valores diarios **publicados** consecutivos ≤ 1,00; la fecha del suceso es el 5.º día | 3,08 $ (20/11/2026) |
| c5 | Real | Quiebra de OpenAI o Anthropic | Manual (`data/manual/eventos.json`) | existe un evento con `tipo: "quiebra"` y `verificado: true` | No |
| c6 | Real | OpenAI es adquirida | Manual | existe un evento con `tipo: "adquisicion_openai"` y `verificado: true` | No |

**Estados por tarjeta (texto y color):**

| Estado | Regla |
|---|---|
| `cumplida` (rojo) | cumplida hoy o suceso en los últimos 90 días |
| `muy_cerca` (ámbar oscuro) | proximidad ≥ 85 |
| `vigilancia` (ámbar) | proximidad entre 60 y 85 |
| `lejos` (verde) | proximidad < 60 |
| `sin_dato` (gris) | no hay dato válido en los últimos 5 días hábiles |

Para c4, la proximidad es `clamp((pRef − p) / (pRef − 1), 0, 1) × 100`, con pRef = el máximo de SDH100RT en los últimos 365 días. Para c5 y c6, la proximidad es 0 (normal), 50 (tensión, fijada en manual) o 100 (evento verificado).

### 4.3 Línea temporal de la ventana
Componente `VentanaTimeline`: eje X desde hoy − 120 días hasta el 31/12/2026, con una banda sombreada de 90 días que termina en el último suceso; un punto por suceso de c1…c6 (color del bloque) y un contador grande «Condiciones en ventana: N/6 · Faltan 3−N para el criterio de pinchazo». Si N ≥ 3, se activa el banner rojo: **«Se cumple el criterio de pinchazo de Polymarket (3 de 6 en 90 días)»**.

---

## 5. Catálogo de indicadores

Formato de cada ficha: **ID · Nombre** · Módulo · Qué mide · Por qué importa (según el vídeo, mm:ss) · Fuente · Clave · Frecuencia · Fórmula · Umbrales (V = verde, A = ámbar, R = rojo; «(P)» = propuesto por esta especificación, no por el vídeo) · Visualización · Texto de ayuda.

> **v1.1:** donde esta sección dice «manual», el dato ya no lo edita una persona. Lo alimenta el job J2 (sección 18.3) mediante PR con fuente y cita verificada, o el recolector J1 (sección 18.4). Los ficheros de `data/manual/` siguen siendo el formato de almacenamiento. La fuente, el refresco, la caché y la caducidad de cada dato están consolidados en la sección 18.1.

Fuentes verificadas el 21/11/2026 con una consulta real (ver la sección 7):

- Yahoo chart v8: gratis, sin clave y no oficial.
- FRED fredgraph.csv: gratis, sin clave.
- Polymarket Gamma y CLOB: gratis, sin clave.
- SEC EDGAR XBRL: gratis, sin clave, con cabecera User-Agent obligatoria.
- Silicon Data: de pago (planes Plus/Professional), con clave Bearer. Si no hay clave, entrada manual.

### M1 — Termómetro

**I01 · Nasdaq Composite: caída desde el máximo**
- Módulo: M1.
- Qué mide: la caída del índice tecnológico amplio.
- Por qué importa: el vídeo arranca con el «batacazo» del Nasdaq y la entrada técnica en mercado bajista (00:00).
- Fuente: Yahoo `^IXIC`, sin clave, diaria.
- Fórmula: dd desde el ATH de cierre.
- Umbrales: V > −10 %; A −10 % a −20 % («corrección»); R ≤ −20 % («mercado bajista», convención citada en el vídeo).
- Visualización: KPI con un sparkline de 1 año y tres chips (1 día, 5 días, desde máximos).
- Ayuda: «Se habla de mercado bajista cuando un índice cae un 20 % o más desde su máximo.»

**I02 · Nasdaq: variación diaria y semanal**
- Fuente: `^IXIC`.
- Fórmula: `close(t) / close(t−1) − 1` y `close(t) / close(t−5) − 1`.
- Umbrales (P): diaria: V > −2 %, A −2 % a −4 %, R ≤ −4 %. Semanal: V > −5 %, A −5 % a −10 %, R ≤ −10 %.
- Ayuda: «El viernes 20/11/2026 cayó un 5,3 % en una sesión y más del 10 % en la semana.»

**I03 · NVDA: variación semanal y capitalización perdida**
- Fuente: Yahoo `NVDA` (precio) y acciones en circulación de SEC EDGAR `dei:EntityCommonStockSharesOutstanding` (CIK 0001045810).
- Fórmula: `capPerdida = (close(t−5) − close(t)) × acciones` y `capPerdidaDesdeATH = (ATH − close) × acciones`.
- Umbrales (P): semanal: V > −8 %, A −8 % a −15 %, R ≤ −15 %.
- Ayuda: «El vídeo cifra en más de 1 billón de dólares la pérdida semanal y en casi 3 billones la pérdida desde máximos.»
- Nota: «billón» = 10¹² (escala larga española). Mostrar «1,2 billones $».

### M2 — Polymarket

**I04 · Probabilidad de pinchazo en 2026 (Polymarket)**
- Qué mide: el precio del «Sí» del mercado «AI bubble burst in 2026?», slug `ai-industry-downturn-by-december-31-2026-857`, dentro del evento `ai-bubble-burst-by`.
- Fuente: Gamma `GET https://gamma-api.polymarket.com/events?slug=ai-bubble-burst-by` (campos `markets[].outcomes`, `outcomePrices`, `lastTradePrice`, `volume`, `clobTokenIds`) e histórico `GET https://clob.polymarket.com/prices-history?market={tokenIdYes}&interval=max&fidelity=1440`.
- Clave: ninguna. Frecuencia: cada hora.
- Fórmula: prob = `outcomePrices[index("Yes")]` como número; si falta, `lastTradePrice`.
- Umbrales: V < 20 % (P); A 20–50 % (P); R ≥ 50 % (en el vídeo, el salto «por encima del 50 %» es la señal de alarma).
- Visualización: gauge semicircular de 0–100 % con el número grande; gráfico de línea a 90 días; anotación automática en saltos diarios ≥ 20 pp («+47 pp en un día»).
- Ayuda: «Polymarket es un mercado de predicciones: el contrato "Sí" paga 1 $ si ocurre el suceso. Si cotiza a 0,55 $, el mercado asigna un 55 % de probabilidad.»
- Valores verificados: 20/11/2026 → 7,95 %; 21/11/2026 → 55,35 % (histórico CLOB); precio actual en Gamma: 69,3 %.

**I05 · Probabilidad a junio de 2027**
- Mercado con slug `ai-bubble-burst-by-june-30-2027`, mismo método.
- Se muestra como comparación de horizonte (el vídeo contrasta 2026 con 2027 y 2028). Verificado: 74,5 %.
- Si en el evento aparece un mercado para 2028, se añade automáticamente: la lista de horizontes es dinámica, todos los `markets` del evento con `closed=false`, ordenados por `endDate`.

**I06 · Texto del reglamento del mercado**
- Fuente: `events[0].description` (en inglés).
- Visualización: acordeón «Reglamento original (inglés)» más la traducción fija de la sección 4.2.
- Si cambia el hash SHA-256 de la descripción respecto a `data/seed/polymarket-reglas.sha256`, se muestra el aviso «Polymarket ha cambiado el reglamento; revisa la lógica».

### M3 — Las 6 condiciones

**I07 a I12 = c1…c6** (sección 4).

Cada tarjeta lleva:
- título;
- bloque;
- valor actual;
- umbral (en $ y en %);
- distancia restante;
- barra de proximidad 0–100;
- estado;
- fecha del suceso, si lo hay;
- sparkline de 1 año con una línea horizontal en el precio umbral (para c1–c3, el precio umbral depende del ATH: se dibuja `0,5 × ATH(d)` como serie escalonada);
- cita del vídeo con su mm:ss.

Textos de ayuda (copiar literalmente):
- c1: «Nvidia diseña la mayoría de los chips con los que se entrena y ejecuta la IA. Su cotización resume la apuesta del mercado sobre cuánto se seguirá invirtiendo en IA.»
- c2: «SOXX agrupa las 30 mayores empresas de semiconductores cotizadas en EE. UU., con un peso máximo por empresa. Indica si la caída es de una sola empresa o de todo el sector.»
- c3: «TSMC fabrica los chips, ASML hace las máquinas de litografía, Broadcom diseña chips a medida y equipos de red, Arista hace redes y Supermicro monta servidores.»
- c4: «Es probablemente el indicador más significativo: mide lo que se paga hora a hora por usar los chips. Si sobrara capacidad, sería el primer precio en hundirse.»
- c5: «Los laboratorios alquilan casi toda la capacidad de cómputo. Su quiebra sería un pinchazo de la economía real.»
- c6: «Una adquisición de OpenAI sería una venta de urgencia: que no pueda sobrevivir por sí sola.»

### M4 — Nvidia

**I13 · Ingresos trimestrales de Nvidia y crecimiento interanual**
- Fuente: SEC EDGAR `https://data.sec.gov/api/xbrl/companyconcept/CIK0001045810/us-gaap/Revenues.json`. Filtrar las entradas con `form` en {10-Q, 10-K} y duración de unos 90 días (`end − start` entre 80 y 100 días). Para el 4.º trimestre fiscal, derivarlo como el anual menos los 3 trimestres.
- Clave: ninguna; cabecera `User-Agent: "PanelPinchazoIA contacto@ejemplo.com"` desde la variable `SEC_USER_AGENT`.
- Frecuencia: diaria (los cambios son trimestrales).
- Fórmula: interanual = `rev(q) / rev(q−4) − 1`.
- Respaldo: hasta que se publique el 10-Q del trimestre anunciado el 17/11/2026, se usa la entrada manual `data/manual/nvidia.json` → `{"trimestre":"FY2027Q3","ingresos_musd":115800,"crec_interanual":1.03,"fuente":"Resultados 17/11/2026 (vídeo 06:31)","verificado":false}`. Siempre prevalece el dato de EDGAR si existe para el mismo periodo.
- Umbrales (P), sobre el interanual: V ≥ 30 %, A 0–30 %, R < 0 %.
- Visualización: barras trimestrales (8 trimestres) con la línea de crecimiento.
- Ayuda: «Los resultados son excelentes; el mercado no duda de lo vendido, sino de lo que venderá.»

**I14 · Previsión del siguiente trimestre (guidance)**
- Fuente: `nvidia.json` → `guidance_musd: 130000`, alimentado por J2 desde el 8-K de resultados de la SEC (v1.1; verificado: «Revenue is expected to be $130.0 billion, plus or minus 3%», `q3fy27cfocommentary.htm`). No hay XBRL para la previsión.
- Fórmula: `guidance / ingresos_ultimo − 1` (+12,3 %).
- Umbrales (P), sobre el crecimiento secuencial implícito: V ≥ 5 %, A 0–5 %, R < 0.

**I15 · Garantías máximas otorgadas por Nvidia**
- Fuente: SEC EDGAR `companyconcept/CIK0001045810/us-gaap/GuaranteeObligationsMaximumExposure.json`. Existe y está verificada: 108.500 M$ a 26/07/2026. Respaldo manual con 118.000 M$ al cierre del trimestre más reciente (vídeo 08:12).
- Fórmula: el nivel y la variación trimestral.
- Umbrales (P), sobre `garantías / ingresos anualizados (4 × último trimestre)`: V < 10 %, A 10–25 %, R > 25 %. Con 118.000 / 463.200 ≈ 25,5 % → R.
- Ayuda: «Nvidia no solo vende chips: avala a quien se los compra. Si el cliente deja de pagar, Nvidia responde.»

**I16 · Concentración de garantías en un solo cliente**
- Fuente: manual (`garantia_mayor_musd: 105000`, `descripcion: "Campus de centros de datos en Ohio alquilado a OpenAI durante 20 años"`).
- Fórmula: `105.000 / 118.000 = 89 %`.
- Umbrales (P): V < 25 %, A 25–50 %, R > 50 %.
- Visualización: donut.

**I17 · Registro de los tres frentes (dirección, regulación, financiación)**
- Fuente: manual (`data/manual/frentes_nvidia.json`), con una lista de eventos: `{fecha, frente: "direccion"|"regulacion"|"financiacion", titulo, detalle, fuente_url, gravedad: 1-3, verificado}`.
- Datos semilla: los 3 del vídeo.
  - Salida de Jensen Huang tras el escándalo Megaspeed (gravedad 3).
  - La SEC abre dos investigaciones, una civil sobre la información a inversores y otra contable (gravedad 2).
  - La nueva CEO anuncia la reevaluación de las prácticas de financiación (gravedad 2).
- Todos con `fuente_url` = URL del vídeo con `&t=` y `verificado: false` (el constructor NO debe buscar ni inventar URLs de prensa).
- Estado del frente: gravedad máxima de los eventos de los últimos 180 días (1 → A, 2 → A, 3 → R; sin eventos → V).
- Visualización: tres columnas con chips de estado y la lista cronológica.

**I18 · Acuerdos circulares con neoclouds**
- Qué mide: si en el 10-Q aparece la práctica de comprar servicios de nube a los clientes que compran infraestructura.
- Fuente: manual (booleano `acuerdos_circulares_declarados: true` más la nota). Enlace al listado de filings: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=10-Q`.
- Semáforo: true → A (P).

### M5 — Semiconductores

**I19 · SOXX frente a NVDA (concentración o sector)**
- Fuente: Yahoo `SOXX` y `NVDA`.
- Fórmula: `brecha = ddNVDA − ddSOXX`, en pp.
- Interpretación: si |brecha| < 10 pp, la caída es sectorial; si NVDA cae mucho más, es específica de Nvidia.
- Visualización: dos líneas normalizadas a 100 en el ATH del SOXX.

**I20 · Peor racha de 42 sesiones desde 1994 (^SOX)**
- Fuente: Yahoo `^SOX`, histórico desde el 04/05/1994. Verificado.
- Fórmula: `r42(d) = close(d) / close(d−42) − 1`; el ranking de r42 actual frente a todos los mínimos locales históricos. Texto: «Peor caída en 2 meses desde {mes año del último r42 inferior al actual}».
- Umbrales (P): V > −15 %, A −15 % a −30 %, R ≤ −30 %.
- Verificado a 20/11/2026: SOXX −34,6 % y ^SOX −32,9 %.
- Visualización: histograma o línea de r42 con marcas en 2001 y 2008.
- Ayuda: «El vídeo dice que un desplome así solo se superó en septiembre de 2001.» El panel debe calcularlo y, si su cálculo discrepa, mostrar el dato calculado con la nota «(el vídeo dice septiembre de 2001)».
- Se usa ^SOX porque SOXX solo existe desde 2001.

**I21 · ETF global de semiconductores (referencia)**
- Fuente: Yahoo `SEMI.L` (LSE, USD), con respaldo en `SEC0.DE` (Xetra, EUR). Ambos verificados: iShares MSCI Global Semiconductors UCITS ETF USD Acc, ISIN IE000I8KRLL9.
- Fórmula: dd desde el ATH.
- Visualización: una línea junto al SOXX.
- Ayuda: «Unas 260 empresas de semiconductores de todo el mundo; caída similar a la del SOXX.» Sin enlaces comerciales.

**I22 · Composición destacada del SOXX**
- Contenido: lista estática en `data/seed/soxx_componentes.json` con las 10 empresas citadas (NVDA, AMD, AVGO, MRVL, INTC, MU, TSM, AMAT, LRCX, KLAC) y su papel (diseño, fabricación, maquinaria).
- Se muestra la caída desde el ATH de cada una (Yahoo).
- Nota: «Peso máximo por empresa en torno al 8 % (según el vídeo).» No se hace scraping de pesos.

### M6 — Proveedores

**I23 · Tabla de proveedores (c3 desglosada)**
- Columnas: empresa, papel, ATH (fecha), cierre, caída, precio umbral (50 %), distancia restante, estado y si es «heredada».
- Orden: por proximidad, de mayor a menor, excluyendo las heredadas, que van al final con la nota.
- Fila destacada: la más cercana (hoy AVGO, que necesita bajar a 240,79 $).

### M7 — Economía real del cómputo

**I24 · Alquiler de la H100 (SDH100RT)**
- Fuente:
  - Si existe `SILICONDATA_API_KEY`: `POST https://api.silicondata.com/api/gpu-index/index` con `Authorization: Bearer {key}` y cuerpo `{"gpu":"h100","index_version":"neo","starting_date":"YYYY-MM-DD","ending_date":"YYYY-MM-DD"}`. La respuesta trae `data.indexes` = `{fecha: "2.25"}`. Los valores negativos significan «aún no generado» y se ignoran. Solo para suscriptores Plus/Professional.
  - Si no hay clave: `data/manual/gpu_alquiler.csv` con las columnas `fecha,gpu,indice,usd_hora,fuente,verificado`.
- Página pública de consulta manual: https://www.silicondata.com/products/silicon-index/h100. No se hace scraping de esa página: los términos son desconocidos y es frágil.
- Frecuencia: diaria (días hábiles).
- Fórmulas: nivel, Δ30d y Δ desde el 01/12/2025; «días consecutivos ≤ 1 $».
- Umbrales: R = 5 días consecutivos ≤ 1,00 $ (Polymarket). Estos son (P):
  - A si `p ≤ 1,5` o `Δ90d ≤ −25 %`;
  - V si `p > 1,5` y `Δ90d > −10 %`;
  - en el resto de casos, A claro.
- Visualización: línea con una banda horizontal en 1 $ y las etiquetas «hace 1 mes», «dic. 2025» y «hoy».
- Ayuda: «Si se hubiera construido más capacidad de la necesaria, veríamos chips ociosos y alquileres a la baja. Hoy el alquiler sube.»
- Semilla (`verificado` indica el origen):
  - 2026-11-20: 3,08 (página de Silicon Data, verificado);
  - 2026-11-20: 3,1 (vídeo);
  - ~2026-10-20: 2,88 (vídeo);
  - 2025-12-01: valor vacío con la nota «el vídeo dice "en apenas … $" (inaudible); coherente con unos 2 $».
  - El 2,88 se carga con `fuente:"video"` y fecha aproximada `2026-10-20`.

**I24b · Índice abierto de alquiler (IAA), gratuito (v1.1)**
- Fuentes: RunPod, Vast.ai, Azure Retail Prices y AWS (sección 18.2; todas verificadas y sin clave).
- Fórmula: la sección 18.2. Histórico propio en `data/auto/gpu_alquiler_abierto.csv`.
- Umbrales: los mismos que I24, pero como proxy.
- Visualización: una línea discontinua junto a SDH100RT, con la etiqueta «Proxy abierto (no oficial)».

**I25 · Anomalía de depreciación**
- Qué mide: si el alquiler de una GPU de generación anterior sube en lugar de bajar.
- Fórmula: `anomalía = Δ12m(H100) > 0` mientras existan generaciones posteriores (B200) con precio > H100.
- Estado: «Anomalía presente: la demanda supera a la capacidad» (V para el riesgo de pinchazo real).
- Ayuda: «Lo normal sería que la H100 se abaratara al llegar chips nuevos, como un ordenador cuando sale otro modelo.»

**I26 · B200 y otras GPU**
- Fuente: la misma API de Silicon Data con `gpu` en `b200`, `h200`, `a100`, `b300` y `mi300x`; o el CSV manual. Semilla: B200 ≈ 10 $/h (vídeo 16:17, `verificado:false`).
- Visualización: barras «precio por hora por generación».

### M8 — Laboratorios

**I27 · Estado de OpenAI y Anthropic (c5/c6)**
- Fuente: manual `data/manual/laboratorios.json`: `{lab, estado:"normal"|"tension"|"evento", nota, fecha}`.
- Semilla: ambas en «normal», con la nota del vídeo «quiebra prácticamente imposible en las próximas 6 semanas» (17:29).

**I28 · Cotización de Anthropic (ANT, Nasdaq)**
- Fuente: Yahoo `ANT`. Verificado: el ticker existe (Anthropic, PBC, NMS) y tiene muy pocas sesiones.
- Fórmula: el cierre frente al precio de la OPV (83 $, del vídeo) y dd desde el ATH.
- Umbrales (P): V si el cierre ≥ 83 $; A si está entre 58,1 y 83 (hasta −30 %); R si está por debajo de 58,1 $.
- Ayuda: «Anthropic acaba de salir a bolsa a 83 $ por acción.»
- Si Yahoo no devuelve datos, «sin dato».

**I29 · Financiación captada por los laboratorios**
- Fuente: manual `data/manual/financiacion_labs.json`: `{lab, fecha, importe_musd, tipo:"OPV"|"ronda"|"deuda", nota, fuente_url, verificado}`.
- Semilla: Anthropic OPV con más de 81.000 M$ (`verificado:false`, fuente: el vídeo); OpenAI con «decenas de miles de millones en 2026», con importe `null` y nota.
- Visualización: barras acumuladas por año.
- Semáforo (P): R si no hay rondas en 180 días y la ventana de OPV está en R.

### M9 — Condiciones financieras y políticas

**I30 · Bono del Tesoro de EE. UU. a 10 años**
- Fuente: FRED `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`, sin clave. Verificado: 5,04 a 19/11/2026. Respaldo intradía: Yahoo `^TNX` (en %).
- Umbrales (P), anclados en el «ronda el 5 %» del vídeo: V < 4,25 %, A 4,25–4,75 %, R ≥ 4,75 %.

**I31 · Tipo objetivo de la Fed y tendencia**
- Fuente: FRED `DFEDTARU` (límite superior; verificado: subió de 3,75 a 4,00 el 17/09/2026, coherente con el vídeo) y `DFEDTARL`.
- Fórmula: `Δ180d` del límite superior.
- Umbrales (P): V si Δ < 0 (bajadas); A si Δ = 0; R si Δ > 0 («la Reserva Federal está subiendo los tipos», 19:03).

**I32 · Ventana de salidas a bolsa (proxy)**
- Fuente: Yahoo `IPO` (Renaissance IPO ETF; verificado 41,35 $, −11,5 % en 5 días).
- Fórmula: Δ60d.
- Umbrales (P): V > 0 %, A 0 a −15 %, R ≤ −15 %.
- Ayuda: «Proxy de la ventana de OPV: cartera de empresas recién salidas a bolsa. Si cae, la ventana se estrecha.»
- Complemento manual: `data/manual/opv.json` con OPV relevantes de IA (por ejemplo, Anthropic).

**I33 · Repliegue de Nvidia como financiadora**
- Fuente: combina I15 (variación trimestral de garantías) e I17 (eventos del frente financiación).
- Regla: R si las garantías bajan > 10 % en el trimestre o si hay un evento de financiación con gravedad 3; A si hay un evento con gravedad ≤ 2.
- Semilla: A (anuncio de reevaluación).

**I34 · Riesgo regulatorio y político sobre los centros de datos**
- Fuente: manual `data/manual/regulacion.json`: `{fecha, ambito:"EEUU"|"UE"|"otro", titulo, efecto:"freno_cpd"|"exportacion"|"investigacion"|"otro", gravedad 1-3, fuente_url, verificado}`.
- Semilla: «Victoria demócrata en las elecciones de mitad de mandato → temor a que se frene la construcción de centros de datos» (19:17, gravedad 2) y «Posible sobrerregulación desde Washington» (23:30, gravedad 2).
- Semáforo: la gravedad máxima a 180 días.

### M10 — Escenarios

**I35 · Divergencia financiero-real**
- Fórmula: `D = F − R` (subíndices de la sección 6), entre −100 y 100.
- Interpretación: D ≥ 40 → «Pinchazo financiero sin reflejo real»; −20 < D < 40 → «Ajuste mixto»; D ≤ −20 → «Deterioro real».
- Visualización: barra divergente.

**I36 · Diagnóstico de escenario.** Reglas deterministas, evaluadas en este orden:

| Condición | Resultado |
|---|---|
| ≥ 3 condiciones en la ventana | **Pinchazo según Polymarket** (negro o rojo) |
| R ≥ 50, o c4 en A o R por tendencia (Δ90d ≤ −25 %), o c5/c6 en «tension» | **Escenario 2: el ajuste llega a la economía real** |
| F ≥ 60 y R < 25 e I24 Δ30d ≥ 0 | **Escenario 1: corrección financiera, economía real sólida** |
| F ≥ 60 y R < 25 e I24 Δ30d < 0 | **Escenario 1 con señales de contagio** |
| F < 60 y R < 25 | **Sin pinchazo** |
| Ninguna de las anteriores | **Ajuste mixto** |

Cada resultado muestra la lista de evidencias: los indicadores que lo disparan con su valor.

**I37 · Mecanismo de retroalimentación**
- Diagrama estático (SVG) con este circuito: financiación cara o cerrada → los laboratorios compran menos cómputo → baja la demanda → baja el precio del alquiler → caen las ventas de chips.
- Los nodos se colorean con el estado vivo de I30/I31/I32 (financiación), I29 (laboratorios), I24 (alquiler) e I13/I14 (ventas).
- Texto: «Lo financiero no solo puede anticipar el pinchazo real: puede provocarlo» (22:56).

### M11 — Puntocom

**I38 · Nasdaq 2000 frente a Nasdaq actual**
- Fuente: Yahoo `^IXIC` (desde 1971).
- Fórmula: dos series normalizadas a 100 en su máximo de cierre: el máximo del 10/03/2000 (calcularlo) y el ATH actual. Eje X = sesiones desde el máximo, de −250 a +750.
- Visualización: dos líneas.
- Ayuda: «El Nasdaq empezó a hundirse en marzo de 2000; el precio de la fibra se desplomó después.»

**I39 · Fibra: precio frente a demanda (2000-2002)**
- Fuente: estática `data/seed/puntocom.json`:
  - precio de un enlace LA–NY por año: 2000 → 1.800.000 $; 2001 → 590.000 $; 2002 → 4.000 $, con `dudoso:true` y la nota «cifra del audio; podría ser 40.000 $»;
  - ancho de banda submarino como índice: 2000 = ×3; 2001 = ×3 (acumulado ×9).
- Visualización: barras en escala logarítmica, más la línea de demanda.
- Texto: «La demanda se triplicó dos años seguidos, pero la capacidad creció aún más deprisa: Global Crossing quebró.»

**I40 · Análogo actual**
- Tarjeta que compara SDH100RT (el «precio de la fibra» actual) con la serie de la fibra.
- Regla: si SDH100RT cae > 50 % en 12 meses → «Patrón puntocom en marcha» (R); si no, «Sin patrón puntocom en el precio del cómputo» (V).

### M0 — Cabecera

**I41 · Frase del día**
- Plantilla determinista, sin LLM: «{N}/6 condiciones en ventana · Polymarket {p} % · NVDA a {dist} % de su umbral · H100 a {precio} $/h ({Δ30d}). Lectura: {diagnóstico}.»

**I42 · Valor evaporado de Nvidia desde máximos.** Igual que I03; se muestra en M0 y M11 («casi 3 billones», 23:57).

---

## 6. Índice de Riesgo de Pinchazo (IRP)

**Objetivo:** un número de 0 a 100 que resuma la proximidad al pinchazo, respetando la tesis del vídeo de que lo real pesa más que lo financiero.

### 6.1 Normalización
Cada componente se lleva a 0–100 («proximidad al pinchazo»):

| Componente | Normalización |
|---|---|
| c1, c2, c3 | proximidad de la sección 4.1 (c3 = la máxima de los proveedores no heredados) |
| c4 | `max( clamp((pRef−p)/(pRef−1)) × 100 , tendencia )`, con `tendencia = clamp(−Δ90d / 50 %, 0, 1) × 100` |
| c5, c6 | 0 / 50 / 100 (normal / tensión / evento) |
| I30 bono a 10 años | `clamp((r − 3,5) / (5,5 − 3,5)) × 100` (P) |
| I31 Fed | 0 si Δ180d < 0; 50 si = 0; 100 si > 0 |
| I32 OPV | `clamp(−Δ60d / 30 %, 0, 1) × 100` |
| I33 repliegue de Nvidia | V = 0, A = 50, R = 100 |
| I34 regulación | gravedad máxima × 33,3 |

### 6.2 Subíndices y pesos (P, justificados)
- **F (Financiero)** = media de c1, c2 y c3 (pesos 1/3). Son las condiciones 1-3 del vídeo.
- **R (Real)** = 0,50·c4 + 0,25·c5 + 0,25·c6. El vídeo dice que c4 es «el más significativo de los seis».
- **P (Puente de financiación)** = 0,25·I30 + 0,20·I31 + 0,20·I32 + 0,20·I33 + 0,15·I34. Son los motores del escenario 1 y la vía de contagio del escenario 2.
- **IRP** = 0,25·F + 0,50·R + 0,25·P.

Justificación: el vídeo concluye que el pinchazo significativo es el de la economía real; el financiero «como mucho» es un pinchazo de valoraciones. P pesa porque es el canal de transmisión de lo financiero a lo real (22:11).

**Regla de anulación:** si se cumplen ≥ 3 condiciones en la ventana, el IRP se muestra como «100 · PINCHAZO (criterio Polymarket)», sea cual sea la media.

**Sin datos:** si falta un componente, se renormalizan los pesos de su subíndice con los disponibles y se muestra «IRP parcial (faltan: …)». Si falta un subíndice entero, el IRP es «sin dato».

### 6.3 Semáforo global (P) y ejemplo verificado
- 0–29: verde, «Sin pinchazo».
- 30–49: ámbar, «Tensión».
- 50–69: naranja, «Pinchazo financiero / riesgo de contagio».
- 70–100: rojo, «Pinchazo».

Ejemplo con datos reales a 20-21/11/2026 (será el **fixture de aceptación**, con una tolerancia de ±3 puntos):

| Componente | Cálculo | Valor |
|---|---|---|
| c1 | 47,53 / 50 | 95,1 |
| c2 | cumplida | 100 |
| c3 | AVGO: 36,8 / 50 | 73,6 |
| **F** | media | **89,6** |
| c4 | 3,08 $ ≈ máximo anual; Δ90d > 0 | 0 |
| c5 / c6 | normal | 0 / 0 |
| **R** | | **0** |
| I30 | (5,04 − 3,5) / 2 | 77 |
| I31 | 3,75 → 4,00 | 100 |
| I32 | IPO Δ60d −24,8 % | 82,7 |
| I33 | ámbar | 50 |
| I34 | gravedad 2 | 66,7 |
| **P** | | **75,8** |
| **IRP** | 0,25·89,6 + 0 + 0,25·75,8 | **≈ 41 → ámbar «Tensión»** |

Diagnóstico: F ≥ 60, R < 25 y Δ30d H100 ≥ 0 → «Escenario 1: corrección financiera, economía real sólida». Coincide con la conclusión del vídeo (23:04). La divergencia es D = 89,6 → «Pinchazo financiero sin reflejo real».

### 6.4 Comparación con Polymarket
El IRP **no** incluye la probabilidad de Polymarket, para evitar la circularidad. Se muestran juntos en M0 con el texto: «Polymarket refleja lo que apuesta el mercado; el IRP, lo que dicen los datos.»

---

## 7. Fuentes de datos: contratos de los conectores

Todos los conectores viven en `src/lib/connectors/*.ts`, son **solo de servidor** y devuelven `ConnectorResult<T>`:

```ts
type ConnectorResult<T> =
  | { ok: true; data: T; source: string; fetchedAt: string /* ISO UTC */; stale?: boolean }
  | { ok: false; error: string; source: string; fetchedAt: string };
```

Reglas comunes:
- Timeout de 10 s.
- 2 reintentos con backoff exponencial (0,5 s y 1,5 s).
- Cabecera `User-Agent` configurable.
- No se lanzan excepciones fuera del conector.
- Validación con **zod**. Si el esquema no casa, `ok:false`.

| Conector | Endpoint | Clave | Notas |
|---|---|---|---|
| `yahoo.ts` | `GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1=0&period2={now}&interval=1d&events=split` | No | Devuelve `{symbol, currency, points:[{date:'YYYY-MM-DD' (zona de la bolsa, campo meta.exchangeTimezoneName), close}]}`. Descartar `close` nulo. Con `range=max` sin period1, devuelve datos **mensuales**, así que **usar period1=0** (verificado). Respaldo: host `query2`. API no oficial: si falla, se sirve el último snapshot con `stale:true`. Símbolos: `^IXIC, NVDA, SOXX, ^SOX, TSM, ASML, AVGO, ANET, SMCI, AMD, MRVL, INTC, MU, AMAT, LRCX, KLAC, SEMI.L, SEC0.DE, ANT, IPO, ^TNX` (codificar `^` como `%5E`) |
| `fred.ts` | `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id={SERIE}` | No (opcional `FRED_API_KEY` para `https://api.stlouisfed.org/fred/series/observations?series_id=…&api_key=…&file_type=json`) | CSV `observation_date,VALOR`. Los valores `.` o vacíos son nulos. Series: `DGS10, DFEDTARU, DFEDTARL` |
| `polymarket.ts` | Gamma `GET https://gamma-api.polymarket.com/events?slug=ai-bubble-burst-by`; CLOB `GET https://clob.polymarket.com/prices-history?market={tokenYes}&interval=max&fidelity=1440` | No | `outcomes`, `outcomePrices` y `clobTokenIds` llegan como **strings JSON**: hacer `JSON.parse`. El token «Sí» es el índice de `"Yes"` en `outcomes`. `history[].t` en segundos epoch y `p` de 0 a 1 |
| `sec.ts` | `GET https://data.sec.gov/api/xbrl/companyconcept/CIK0001045810/us-gaap/{Revenues,GuaranteeObligationsMaximumExposure}.json` y `…/dei/EntityCommonStockSharesOutstanding.json` | No; `User-Agent` obligatorio (`SEC_USER_AGENT`) | Límite de 10 peticiones por segundo. Deduplicar por `end` + `fp`, quedándose con la entrada del `filed` más reciente |
| `silicondata.ts` | `POST https://api.silicondata.com/api/gpu-index/index` | `SILICONDATA_API_KEY` (de pago) | Sin clave, no se llama: `ok:false, error:"sin_clave"`, y se usa `manual.ts`. Datos desde el 01/09/2024. Pedir por tramos de 365 días |
| `gpuAbierto.ts` (v1.1) | RunPod GraphQL, Vast.ai `cloud.vast.ai/api/v0/bundles/`, Azure `prices.azure.com/api/retail/prices`, AWS `b0.p.awsstatic.com/...` (sección 18.2) | No | El precio de hoy (I24b en vivo); el histórico se lee de `data/auto/gpu_alquiler_abierto.csv`. Revalidate 21.600 s |
| `manual.ts` | Lee `data/manual/*.json\|csv` del repositorio (importación estática en el build) | No | Valida con zod. Un error de esquema hace **fallar el build** (test) |

**Caché y refresco:**
- `fetch(url, { next: { revalidate: N, tags: [tag] } })`.
- N: Yahoo 900 s, Polymarket 900 s, FRED 21.600 s, SEC 86.400 s, Silicon Data 21.600 s.
- Vercel Cron (`vercel.json`) a las 13:00, 21:30 y 23:00 UTC en días laborables (tras el cierre de EE. UU.) y a las 08:00 UTC diaria, contra `/api/cron/refresh`. Esa ruta comprueba `Authorization: Bearer ${CRON_SECRET}` y llama a `revalidateTag` para todas las etiquetas.
- La página `/` usa `export const revalidate = 900`.

**Persistencia:** no hay base de datos. Las series históricas se piden completas a las fuentes. El último snapshot válido de cada conector se guarda en la caché de datos de Next (`unstable_cache` con la etiqueta `snapshot-{conector}`) para servirlo `stale` si la fuente falla.

**Modo simulado:** con `MOCK_DATA=1`, todos los conectores leen `tests/fixtures/{conector}/*.json` en vez de la red. Se usa en los tests y en CI.

---

## 8. Modelo de datos (TypeScript y zod)

```ts
// src/lib/types.ts
export type Semaforo = 'verde' | 'ambar' | 'naranja' | 'rojo' | 'sin_dato';
export type Punto = { date: string; value: number };              // YYYY-MM-DD
export interface Indicador {
  id: string;                    // 'I01'…'I42', 'c1'…'c6'
  modulo: 'M0'|'M1'|'M2'|'M3'|'M4'|'M5'|'M6'|'M7'|'M8'|'M9'|'M10'|'M11';
  nombre: string;
  valor: number | null;          // null = sin dato
  unidad: '%'|'USD'|'USD/h'|'pp'|'MUSD'|'indice'|'bool'|'texto';
  valorTexto?: string;           // ya formateado es-ES
  serie?: Punto[];
  umbrales?: { verde: string; ambar: string; rojo: string; propuesto: boolean };
  semaforo: Semaforo;
  proximidad?: number | null;    // 0-100
  ayuda: string;
  citaVideo?: { texto: string; t: number /* segundos */ };
  fuente: { nombre: string; url: string; manual: boolean; verificado: boolean };
  actualizadoEn: string | null;  // ISO
  stale: boolean;
}
export interface Condicion extends Indicador {
  bloque: 'financiero' | 'real';
  cumplidaHoy: boolean | null;
  fechaSuceso: string | null;
  heredada: boolean;
  precioUmbral?: number | null;
  distanciaRestante?: number | null; // fracción negativa: −0.047
  detalle?: Array<{ ticker: string; nombre: string; papel: string; ath: number; athFecha: string; close: number; dd: number; umbral: number; heredada: boolean; fechaSuceso: string | null }>;
}
export interface Snapshot {
  generadoEn: string;
  condiciones: Condicion[];             // c1..c6
  ventana: { enVentana: string[]; n: number; pinchazo: boolean; inicio: string | null; fin: string | null; limite: string /* '2026-12-31' */ };
  indicadores: Record<string, Indicador>;
  irp: { valor: number | null; parcial: boolean; faltan: string[]; F: number|null; R: number|null; P: number|null; semaforo: Semaforo; etiqueta: string; anulado: boolean };
  escenario: { codigo: 'PINCHAZO_PM'|'E2'|'E1'|'E1_CONTAGIO'|'MIXTO'|'SIN'; titulo: string; evidencias: string[] };
  polymarket: { horizontes: Array<{ slug: string; titulo: string; fin: string; probSi: number | null; volumen: number | null; serie: Punto[] }>; reglasCambiadas: boolean };
  fraseDelDia: string;
  salud: Array<{ conector: string; ok: boolean; error?: string; fetchedAt: string; stale: boolean }>;
}
```

Esquemas de los ficheros manuales (`data/manual/`). Todos tienen la forma `{"_ayuda": "…cómo editar…", "items": [...]}`, salvo el CSV:

- `eventos.json`: `{id, fecha, tipo: "quiebra"|"adquisicion_openai"|"otro", entidad: "OpenAI"|"Anthropic", titulo, fuente_url, verificado: boolean}`. Semilla: `items: []`.
- `laboratorios.json`, `nvidia.json`, `frentes_nvidia.json`, `financiacion_labs.json`, `regulacion.json`, `opv.json`: según la sección 5.
- `gpu_alquiler.csv`: `fecha,gpu,indice,usd_hora,fuente,verificado`.
- `data/seed/puntocom.json`, `data/seed/soxx_componentes.json`, `data/seed/polymarket-reglas.sha256` (calcularlo en el primer build a partir de la descripción descargada y guardarlo; si no hay red, dejarlo vacío y no mostrar aviso) y `data/seed/citas.json`. Este último contiene todas las citas del Apéndice A con `t` en segundos, para los enlaces `https://www.youtube.com/watch?v=JC5wHXu8f7I&t={t}s`.

**Campos comunes de los items de J2 (v1.1):** `fuente_url`, `cita` (literal), `cita_verificada: "pagina"|"snippet"`, `origen: "J2"|"video"|"humano"`, `modelo`, `fecha_alta`, `fecha_dato`, `requiere_revision`, `caduca_en` (en las semillas del vídeo). Ficheros nuevos: `data/auto/gpu_alquiler_abierto.csv`, `data/auto/sucesos.csv` y `data/auto/candidatos_c56.json`.

**Regla de oro:** un dato manual con `verificado:false` se muestra con la insignia «Dato del vídeo, sin verificar». Un dato `null` se muestra como «Sin dato». **Nunca se interpola, extrapola ni inventa un valor.**

---

## 9. Diseño de pantallas

**Estilo:**
- Panel financiero sobrio, **modo oscuro por defecto** con conmutador claro/oscuro (persistido en `localStorage` y respetando `prefers-color-scheme` la primera vez).
- Tipografía: Inter (texto) y JetBrains Mono (cifras, con `font-variant-numeric: tabular-nums`), vía `next/font`.
- Colores (tokens Tailwind):
  - fondo `#0B0F14`; superficie `#121821`; borde `#1F2937`; texto `#E5E7EB`; texto secundario `#9CA3AF`;
  - verde `#22C55E`, ámbar `#F59E0B`, naranja `#F97316`, rojo `#EF4444`, gris «sin dato» `#6B7280`;
  - bloque financiero azul `#3B82F6`; bloque real violeta `#A855F7`.
  - En modo claro: fondo `#F8FAFC` y superficie `#FFFFFF`, con los mismos semánticos oscurecidos lo necesario para el contraste AA.
- El semáforo **nunca** depende solo del color: siempre lleva icono (● verde, ▲ ámbar/naranja, ■ rojo, ○ sin dato) y texto.

**Layout de la portada:**
- Escritorio (≥ 1280 px): rejilla de 12 columnas.
  - M0 como hero a ancho completo: IRP gauge (4 columnas), contador X/6 (2), Polymarket (3) y diagnóstico (3). Debajo, la frase del día.
  - M1: 3 KPI (Nasdaq, NVDA, SOXX).
  - M3: dos filas (financiero y real) de 3 tarjetas, y debajo la línea temporal de la ventana.
  - M4–M11: tarjetas de 6 o 12 columnas.
- Tableta: 6 columnas. Móvil (< 640 px): 1 columna; las tarjetas se apilan y los gráficos tienen una altura de 180 px.
- Cabecera fija con el título «Panel de control del pinchazo de la IA», el subtítulo «Basado en el análisis de Juan Ramón Rallo (21/11/2026)» (con enlace al vídeo), el sello «Actualizado: dd/mm/aaaa hh:mm (hora de Madrid)» y el conmutador de tema.
- Índice lateral (escritorio) o desplegable (móvil) con las anclas.

**Componentes (`src/components/`):**

| Componente | Descripción |
|---|---|
| `GaugeIRP` | Gauge semicircular de 0 a 100 con las bandas del semáforo |
| `ContadorCondiciones` | Contador X/6 |
| `TarjetaCondicion` | Tarjeta de una condición |
| `BarraProximidad` | Barra de proximidad 0–100 |
| `VentanaTimeline` | Línea temporal de la ventana de 90 días |
| `KpiCard` | Valor, variación, sparkline y semáforo |
| `GraficoSerie` | Recharts `LineChart` con `ReferenceLine` para los umbrales |
| `TablaProveedores` | Tabla de proveedores |
| `RegistroEventos` | Registro de eventos |
| `DiagnosticoEscenario` | Diagnóstico de escenario |
| `DiagramaRetroalimentacion` | SVG |
| `ComparadorPuntocom` | Comparación con la burbuja puntocom |
| `InsigniaFuente` | Fuente, manual o automática, y verificado |
| `CitaVideo` | Texto con un enlace a YouTube en ese segundo |
| `SinDato` | Estado sin dato |
| `AvisoStale` | «Dato de dd/mm, la fuente no responde» |
| `PieLegal` | Pie legal |

**Copys fijos (en español de España; formato es-ES: «1.234,5», «−47,5 %», fechas dd/mm/aaaa):**
- M0, título: «¿Ha pinchado la burbuja de la IA?»; subtítulo dinámico: el diagnóstico.
- M3, cabeceras de bloque: «Pinchazo financiero (condiciones 1-3)» y «Pinchazo de la economía real (condiciones 4-6)».
- M10, títulos de escenario: «Escenario 1 · Pánico financiero sin reflejo real» y «Escenario 2 · La bolsa anticipa (o provoca) el ajuste real».
- M12: la explicación del IRP (sección 6), la lista de fuentes con su estado y las limitaciones (sección 16).
- Estado vacío: «Sin dato. No mostramos estimaciones.»
- Pie: «Panel informativo. No es una recomendación de inversión. Fuentes: Yahoo Finance, FRED, Polymarket, SEC EDGAR, Silicon Data y datos manuales señalados.»

**Gráficos:**
- Tooltips con la fecha y el valor formateados.
- Ejes con `toLocaleString('es-ES')`.
- Rangos seleccionables: 3M, 6M, 1A, 5A y Máx.

**Página `/condicion/[id]`:** cabecera con el estado, el gráfico grande con el umbral, una tabla con los últimos 30 cierres, la cita del vídeo, la regla literal de Polymarket (en inglés y su traducción) y el desglose (en c3, la tabla de proveedores).

---

## 10. Accesibilidad
- WCAG 2.2 AA: contraste ≥ 4,5:1 en el texto, foco visible y navegación completa por teclado.
- Los gráficos tienen `role="img"` y un `aria-label` con un resumen textual, además de un botón «Ver datos en tabla» que muestra una tabla accesible.
- Gauge y semáforo con `aria-valuenow` y texto.
- `lang="es"` y enlace «Saltar al contenido».
- Respeto de `prefers-reduced-motion` (sin animaciones de los gauges).

---

## 11. Stack y estructura

- **Stack fijo:**
  - Next.js 15 (App Router) con TypeScript estricto y React 19;
  - Tailwind CSS 4, Recharts 2, zod 3, date-fns 4 con @date-fns/tz, clsx y lucide-react;
  - Vitest más Testing Library (unitarios), Playwright (e2e y accesibilidad con @axe-core/playwright), ESLint y Prettier;
  - Node 20 y pnpm.
- **Despliegue:** Vercel, con Vercel Cron.
- **Sin base de datos y sin autenticación.**

```
panel-pinchazo-ia/
├─ app/
│  ├─ layout.tsx  page.tsx  globals.css
│  ├─ condicion/[id]/page.tsx   indicador/[id]/page.tsx   trazabilidad/page.tsx
│  └─ api/{snapshot,health}/route.ts   api/cron/refresh/route.ts
├─ src/
│  ├─ lib/connectors/{yahoo,fred,polymarket,sec,silicondata,manual}.ts
│  ├─ lib/calc/{drawdown,condiciones,ventana,irp,escenario,frase,r42,formato}.ts
│  ├─ lib/{types,schemas,config,snapshot}.ts
│  └─ components/…  (sección 9)
├─ data/manual/*.json|csv     data/seed/*.json
├─ tests/unit/*.test.ts       tests/e2e/*.spec.ts   tests/fixtures/**
├─ data/auto/*.csv|json        (v1.1: escrito por J1/J2 vía PR)
├─ scripts/{collect,research,monitor,contract,setup}/*.ts   (v1.1)
├─ tests/{maintenance,contract}/**                           (v1.1)
├─ .github/workflows/{ci,collect,research,monitor,contracts,deploy}.yml  .github/CODEOWNERS  renovate.json   (v1.1)
├─ vercel.json  .env.example  README.md  DECISIONES.md
```

`src/lib/config.ts` centraliza los parámetros: símbolos, umbrales, pesos, fecha límite, slug de Polymarket y URLs. Nada de números mágicos en los componentes.

`snapshot.ts::buildSnapshot()` llama a todos los conectores en paralelo (`Promise.allSettled`), calcula y devuelve un `Snapshot`. Las páginas y la API usan esta misma función.

`vercel.json`:
```json
{ "crons": [
  { "path": "/api/cron/refresh", "schedule": "0 13 * * 1-5" },
  { "path": "/api/cron/refresh", "schedule": "30 21 * * 1-5" },
  { "path": "/api/cron/refresh", "schedule": "0 23 * * 1-5" },
  { "path": "/api/cron/refresh", "schedule": "0 8 * * *" }
] }
```
Si el plan de Vercel solo permite 1 cron diario, se deja solo el de las `30 21 * * 1-5` y la ISR de 900 s cubre el resto.

---

## 12. Variables de entorno (`.env.example`)

**Aplicación (Vercel):**

| Variable | Obligatoria | Valor por defecto | Uso |
|---|---|---|---|
| `SEC_USER_AGENT` | Sí | `PanelPinchazoIA admin@example.com` | Cabecera para SEC EDGAR |
| `CRON_SECRET` | Sí en Vercel | (generar aleatorio) | Protege `/api/cron/refresh` |
| `HEALTH_TOKEN` | Sí | (generar aleatorio) | Protege `/api/health?detalle=1` (antigüedad por dato) para el job de monitorización |
| `SILICONDATA_API_KEY` | No | vacío | Si existe, I24/I26 usan el índice oficial por API |
| `FRED_API_KEY` | No | vacío | Usa la API oficial de FRED en vez del CSV |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | Enlaces absolutos y URL que vigila la monitorización |
| `HTTP_USER_AGENT` | No | `Mozilla/5.0 (PanelPinchazoIA)` | Yahoo, Polymarket, RunPod, Vast, Azure y AWS |
| `MOCK_DATA` | No | vacío | `1` = usar los fixtures (CI y tests) |

**GitHub Actions (secretos y variables del repositorio):**

| Nombre | Tipo | Obligatoria | Uso |
|---|---|---|---|
| `GITHUB_TOKEN` | automático | — | Crea PR e issues y etiqueta (permisos `contents: write`, `pull-requests: write`, `issues: write` declarados en cada workflow) |
| `PERPLEXITY_API_KEY` | secreto | Sí para J2 | Investigación con LLM y búsqueda web (sección 18.3) |
| `RESEARCH_MODEL` | variable | No (`sonar-pro`) | Modelo del investigador |
| `RESEARCH_MAX_USD_DIA` | variable | No (`1.00`) | Tope de gasto diario estimado del job J2; si se supera, se detiene y abre un issue |
| `SEC_USER_AGENT` | variable | Sí | El mismo que en la app |
| `SITE_URL` | variable | Sí | URL de producción para J3 |
| `HEALTH_TOKEN` | secreto | Sí | El mismo que en la app |
| `ALERT_WEBHOOK_URL` | secreto | No | Webhook genérico (Slack, Teams, Discord o cualquier endpoint que acepte POST JSON) |
| `ALERT_EMAIL_TO` | variable | No | Destinatario de las alertas por correo |
| `RESEND_API_KEY` | secreto | No | Envío de correo de alertas vía Resend (`POST https://api.resend.com/emails`); sin clave no se envía correo |
| `ALERT_EMAIL_FROM` | variable | No | Remitente verificado en Resend |
| `AUTOFIX_AGENT` | variable | No (`off`) | `on` = J4 lanza un agente de código que propone un arreglo en un PR (nunca se mergea solo) |
| `ANTHROPIC_API_KEY` u `OPENAI_API_KEY` | secreto | Solo si `AUTOFIX_AGENT=on` | Clave del agente de autorreparación |
| `C56_AUTOMERGE_TIMEOUT_H` | variable | No (`72`) | Horas tras las que un PR de c5/c6 con regla B cumplida se mergea solo; `0` = nunca |
| `RENOVATE_TOKEN` | — | No | No hace falta: se usa la GitHub App de Renovate |

**Vercel:** proyecto conectado al repositorio por la integración de Git (despliegue automático de `main` a producción y preview en cada PR). Si no existe la integración, el workflow `deploy.yml` usa `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` (secretos) con `vercel deploy --prebuilt --prod`.

---

## 13. Errores y datos ausentes
1. Fallo de un conector: se sirve el último snapshot válido con `AvisoStale` («Dato del dd/mm hh:mm; la fuente no responde»). Si nunca ha habido uno, «Sin dato».
2. Serie con huecos: se dibujan los huecos; **no se interpola**.
3. Datos antiguos: una serie diaria con el último punto de más de 5 días hábiles se marca como `stale`, y la condición pasa a `sin_dato` si tiene más de 10.
4. Las cifras del vídeo se usan solo como semilla manual, siempre etiquetadas.
5. `/api/health` devuelve el código 200 con el detalle si al menos el 50 % de los conectores están bien; si no, 503.
6. Hay un error boundary por módulo: un módulo roto no rompe la página.
7. Los logs van a la consola del servidor (Vercel) con el formato `[conector] mensaje`, sin claves.

---

## 14. Tests y criterios de aceptación (verificables)

**Unitarios (Vitest), con fixtures en `tests/fixtures/` construidos con los valores del 20/11/2026 de las secciones 4.2 y 6.3:**
1. `drawdown`: NVDA, con ATH 239,24 y cierre 125,53 → dd = −47,53 % ±0,01; umbral = 119,62; distancia = −4,71 %.
2. `condiciones`:
   - SOXX 123,40 frente a un ATH de 218,34 → cumplida.
   - AVGO 304,41 frente a 481,57 → no cumplida, umbral 240,79.
   - SMCI, cumplida de forma continua desde 2024 → `heredada:true` y no cuenta.
3. `ventana`:
   - Sucesos el 10/01, 05/02 y 03/03/2026 → pinchazo = true.
   - Sucesos el 10/01, 20/04 y 01/11/2026 → false (son los ejemplos del reglamento de Polymarket).
   - 3 proveedores dentro de c3 → cuentan como 1.
4. `c4`: la serie [1,0; 0,99; 1,0; 0,95; 1,0] → cumplida en el 5.º día; con [1,0; 1,0; 1,01; 1,0; 1,0; 1,0] → no cumplida.
5. `irp`: el fixture de la sección 6.3 → IRP de 41 ±3, semáforo ámbar y escenario `E1`. Si se añaden sucesos que completan 3 → «100 · PINCHAZO» y escenario `PINCHAZO_PM`.
6. `irp` parcial: sin c4 (Silicon Data sin dato) → R se calcula solo con c5 y c6, y `parcial:true` con `faltan:['c4']`.
7. `polymarket`: parsea `outcomes` y `outcomePrices` en string → probSi = 0,693.
8. `fred`: el valor `.` se convierte en null.
9. `manual`: un JSON inválido hace fallar el test.
10. `formato`: 1234.5 → «1.234,5»; −0.475 → «−47,5 %»; 1,2e12 → «1,2 billones $».
11. `r42`: con la serie fixture de ^SOX, devuelve el mes del último r42 inferior.
12. `yahoo`: con un fixture que contiene `close: null`, se descarta el punto.

**E2E (Playwright, con `MOCK_DATA=1`: los conectores leen `tests/fixtures`):**
1. La portada carga en menos de 3 s en local y muestra: IRP, «1/6» (c2 en ventana según el fixture), la probabilidad de Polymarket y el diagnóstico «Escenario 1».
2. Existen las 6 tarjetas, con el texto «CUMPLIDA» en c2.
3. Si se simula la caída de Yahoo, aparecen `AvisoStale` o «Sin dato» y la página no da error.
4. El conmutador de tema funciona y persiste tras recargar.
5. axe: 0 violaciones serious o critical en `/`, `/condicion/c4` y `/trazabilidad`.
6. Con el viewport de un iPhone 13 no hay scroll horizontal.
7. `/trazabilidad` lista todas las filas del Apéndice A (≥ 80).
8. `/api/cron/refresh` sin el token → 401.

**Aceptación final (checklist que el constructor debe marcar en el README):**
- Los 42 indicadores y las 6 condiciones están renderizados.
- Cada cifra lleva su fuente y su fecha.
- Ningún dato es inventado.
- `pnpm build`, `pnpm test` y `pnpm e2e` están en verde.
- El cron está configurado.
- Despliegue en Vercel correcto, o, si no hay credenciales de Vercel, el build local funciona y queda documentado el `vercel deploy`.


**Mantenimiento (v1.1).** Tests en `tests/maintenance/`. Todos usan fixtures y simulan la API de GitHub con `msw`; ninguno usa la red salvo los de `tests/contract`.
1. `research/verificar`: una cita que no está en el HTML fixture → item descartado; una cita presente pero con la cifra 130 ausente → descartado; con la cita y la cifra presentes → aceptado con `cita_verificada:"pagina"`.
2. `research/nvidia-regex`: sobre el fixture `q3fy27cfocommentary.htm` (copia recortada del documento real de la SEC) extrae los ingresos = 115,8 mil M$, el +103 %, la previsión = 130,0 mil M$ y la garantía máxima = 105 mil M$.
3. `research/automerge`:
   - un PR solo con altas de GPU dentro de rango → `automerge`;
   - una variación de +30 % → `revision-humana`;
   - un item `quiebra` → `revision-humana`;
   - la modificación de un item existente → `revision-humana`.
4. `research/c56`:
   - un 8-K fixture de ANT con «Item 1.03» → c5 activable por la regla A;
   - 3 medios permitidos y verificados en 72 h sin desmentido → regla B (PR en revisión; con el reloj simulado + 73 h y reconfirmación → merge);
   - 2 medios, o un desmentido → no se activa;
   - `cita_verificada:"snippet"` → nunca se mergea solo.
5. `research/sin-clave`: sin `PERPLEXITY_API_KEY`, los pasos LLM se omiten y los deterministas producen el PR.
6. `research/no-inventar`: una respuesta LLM fixture con `items:[]` → no hay PR; una respuesta con una URL que da 404 → descartada.
7. `collect/iaa`:
   - con los fixtures de RunPod (2,69 y 4,39), Vast (mediana 2,27) y Azure/AWS (12,29 y 6,88) → IAA_neo H100 = 2,69 e IAA_hs = 9,585;
   - RunPod con un precio 0 → excluido;
   - una sola fuente → sin dato.
8. `monitor/health`: un dato con una antigüedad > `umbralSinDatoH` → issue `[monitor]` creado; con un issue abierto con el mismo título → comentario y no un duplicado; con 2 ejecuciones en verde → issue cerrado; el webhook se llama solo al abrir y al cerrar.
9. `contract/diff`: con un fixture de Yahoo en el que `close` pasa a `closePrice` → issue `[contrato]` con el diff que contiene `- close` y `+ closePrice`; `AUTOFIX_AGENT=off` → no se lanza ningún agente.
10. `lifecycle/polymarket`:
    - un mercado de 2026 con `closed=true` y `outcomePrices ["0","1"]` → el principal pasa a ser el de junio de 2027 y M2 muestra «Resuelto: No»;
    - sin mercados abiertos → «Sin mercado activo» y una ventana móvil;
    - un evento nuevo descubierto con el mismo hash → PR con automerge.
11. `lifecycle/semillas`: una semilla de H100 del vídeo con `caduca_en` pasada y sin sustituto → «Sin dato reciente»; con un dato de J2 más reciente → la semilla pasa a «Histórico del vídeo».
12. `lifecycle/sec`: un dato de J2 y uno de XBRL del mismo trimestre → la app usa XBRL; si difieren > 1 % → aviso.

**Aceptación de mantenimiento (añadir a la checklist del README):**
- Existen y pasan `actionlint` los workflows `ci.yml`, `collect.yml` (J1), `research.yml` (J2), `monitor.yml` (J3), `contracts.yml` (J4) y, si aplica, `deploy.yml`.
- `renovate.json` es válido (`npx --yes --package renovate renovate-config-validator`).
- Ejecutar a mano `research.yml` con `workflow_dispatch` y `tarea=nvidia` produce un PR con la previsión de 130.000 M$ y su cita, o ningún PR si ya existe. Si no hay credenciales de GitHub en el entorno del constructor, basta con el test 2 y con documentar este paso en el README.
- `monitor.yml` contra una URL inexistente abre un issue `[monitor]` (comprobado en un repositorio de prueba o con `act` y la API simulada).
- `/api/health?detalle=1` sin token → 401; con token → la tabla de la sección 18.1.

---

## 15. Decisiones ya tomadas (no preguntar)

- **D1:** el idioma es solo español (es-ES). Las fechas se muestran en hora de Madrid; los cálculos de mercado usan las fechas de la bolsa (America/New_York).
- **D2:** no hay base de datos, ni login, ni analítica de terceros.
- **D3:** «Sox» del vídeo = **SOXX** (iShares Semiconductor ETF), que es lo que dice el reglamento de Polymarket. ^SOX se usa solo para el histórico desde 1994 (I20).
- **D4:** se usan los cierres diarios de Yahoo (`close`), no `adjclose`. Polymarket habla de «closing stock price».
- **D5 (ampliada en v1.1):** la fecha límite es el `endDate` del mercado principal (el abierto más próximo; hoy, el 31/12/2026). Al cerrarse, se pasa solo al siguiente. Hay descubrimiento semanal de eventos o mercados nuevos y un comportamiento definido si no queda ninguno (sección 18.7.1 y 18.7.4).
- **D6:** el horizonte de evaluación para detectar sucesos es de 120 días hacia atrás desde hoy.
- **D7:** una condición cumplida de forma continua desde antes de hoy − 90 días es «heredada» y no cuenta (caso SMCI). Se muestra con la nota: «Cumplida desde {fecha}; Polymarket y el vídeo no la cuentan como suceso nuevo».
- **D8 (cambiada en v1.1):** c4 oficial = Silicon Data, vía API con clave o con la página pública leída por J2 una vez al día con cita verificada (nunca desde la app). Proxy gratuito = IAA (RunPod, Vast, Azure y AWS), que no cuenta para X/6.
- **D9 (cambiada en v1.1):** el LLM (J2) **propone** eventos de c5/c6 con URL y cita literal verificada por código, pero c5 y c6 **solo se activan** con la regla A (fuente primaria: 8-K Item 1.03 de Anthropic, comunicado oficial o registro judicial) o la regla B (≥ 3 medios permitidos y verificados en 72 h, sin desmentidos, con PR en revisión y merge automático a las `C56_AUTOMERGE_TIMEOUT_H` horas si se reconfirma). Sin regla cumplida, el evento es solo «Posible suceso en investigación» y no cuenta.
- **D10:** la mención patrocinada del vídeo no se incluye.
- **D11:** los pesos y umbrales marcados con (P) son configurables y se muestran con la insignia «umbral propuesto».
- **D12:** la frase del día es una plantilla determinista, sin LLM.
- **D13:** las URLs de prensa no se inventan. Las semillas citan el vídeo con su segundo exacto.
- **D14:** si Yahoo bloquea las peticiones desde Vercel (403 o 429), se reintenta con `query2`. Si sigue fallando, se usa el snapshot `stale` y se documenta en el README como limitación conocida. No se añaden proveedores de pago.
- **D15:** la licencia del código es MIT. El repositorio se llama `panel-pinchazo-ia`.
- **D16:** todas las cifras monetarias van en USD (como las fuentes); no se convierten a euros.
- **D17 (cambiada en v1.1):** las alertas operativas van a issues de GitHub (J3), y opcionalmente a un webhook (`ALERT_WEBHOOK_URL`) y a un correo vía Resend (`RESEND_API_KEY`, `ALERT_EMAIL_TO`), solo en la apertura y el cierre. No hay notificaciones a los usuarios finales del panel.
- **D18:** el mantenimiento corre en GitHub Actions (J1 recolector, J2 investigador, J3 monitor, J4 contratos) más Renovate. No se usa un servidor propio ni Vercel Cron para el mantenimiento: Vercel Cron solo revalida la caché.
- **D19:** el investigador usa Perplexity `sonar-pro` (`PERPLEXITY_API_KEY`, `temperature 0`, salida JSON con esquema), con un tope de gasto diario de `RESEARCH_MAX_USD_DIA`.
- **D20:** el código determinista va siempre antes que el LLM. El LLM nunca escribe directamente: propone, el código verifica (URL viva, cita literal, cifra dentro de la cita, rango) y un PR registra el cambio.
- **D21:** automerge según la sección 18.3.5. Los PR `revision-humana` que no son de c5/c6 se cierran solos a los 14 días. Los PR de autorreparación (J4) y las versiones mayores de dependencias nunca se mergean solos.
- **D22:** el histórico del índice abierto de GPU se construye en el propio repositorio (`data/auto/`), ya que las fuentes gratuitas solo dan el precio actual.

---

## 16. Huecos conocidos (mostrarlos en M12 → «Limitaciones»)

1. **c4 oficial:** la API de Silicon Data es de pago. Sin clave, J2 lee la página pública con cita verificada y, si falla, se usa el proxy gratuito IAA (RunPod, Vast, Azure y AWS). El proxy **no** cuenta para el criterio de Polymarket. IAA_neo da hoy 2,69 $/h frente a los 3,08 de Silicon Data: es otra metodología.
2. **Términos de uso:** la lectura de la página de Silicon Data y del JSON de precios de AWS (`b0.p.awsstatic.com`, no oficial) puede no estar permitida o cambiar sin aviso. Si J4 detecta un cambio o un bloqueo, esa fuente queda desactivada y el resto sigue.
3. **Vast.ai** devuelve pocas ofertas a demanda de H100 SXM (11 el 21/11/2026), lo que hace la mediana ruidosa; por eso se usa como uno de tres componentes.
4. **GDELT** es gratuito, pero en la prueba devolvió el aviso de límite de uso en vez de JSON; es una fuente opcional.
5. **OpenAI es privada:** sus eventos de quiebra, adquisición o financiación dependen de comunicados y medios (regla B y LLM), no de un registro oficial estructurado.
6. **Garantías de Nvidia:** el XBRL lleva un trimestre de retraso respecto al 8-K. J2 lo cubre con el CFO commentary (verificado: «up to a maximum of $105 billion»). El total de 118.000 M$ del vídeo sale de la tabla del mismo documento.
7. **Supermicro:** el vídeo omite su caída. Está alrededor de un −82 % desde su máximo de marzo de 2024, lo que se resuelve con D7. Conviene vigilar cómo lo interpreta Polymarket.
8. **Cifras inaudibles o dudosas del audio:** H100 en diciembre de 2025 y la fibra en 2002. Quedan marcadas y rotan según la sección 18.7.5.
9. **Hechos del vídeo sin fuente primaria todavía** («Megaspeed», la salida de Jensen Huang y las investigaciones de la SEC): J2 los busca. Mientras no haya una cita verificada, se muestran como «Dato del vídeo, sin verificar».
10. **Yahoo** es una API no oficial (D14).
11. **La única degradación sin persona** es un cambio de formato de una fuente que el agente opcional no arregle: el dato queda `stale` y el issue, abierto.

---

## 17. Orden de construcción paso a paso

1. Hacer el scaffold con `pnpm create next-app` (TS, Tailwind, App Router, src/), instalar las dependencias y configurar ESLint, Prettier y Vitest.
2. Escribir `types.ts`, `schemas.ts` (zod) y `config.ts` (símbolos, umbrales, pesos, slug, fecha límite).
3. Escribir los ficheros `data/seed` y `data/manual` con las semillas de las secciones 5 y 8, más `citas.json` (todas las del Apéndice A).
4. Implementar `calc/` (drawdown, condiciones, ventana, r42, irp, escenario, frase y formato) con sus tests unitarios **antes** de los conectores (TDD con fixtures).
5. Implementar los conectores con zod y el modo `MOCK_DATA`, con tests de parseo sobre las respuestas fixture. Para crear los fixtures, descargar una vez las respuestas reales y recortarlas; si no hay red, sintetizarlas con los valores de las secciones 4.2 y 6.3.
6. Escribir `snapshot.ts` y las rutas `/api/snapshot`, `/api/health` y `/api/cron/refresh`.
7. Crear el layout, los tokens de tema, el conmutador de tema, la cabecera, el índice y el pie.
8. Construir los componentes base (KpiCard, GraficoSerie, InsigniaFuente, SinDato, AvisoStale y CitaVideo).
9. Construir los módulos en este orden: M3 (condiciones, más la línea temporal), M0, M2, M1, M7, M4, M6, M5, M8, M9, M10, M11 y M12.
10. Crear las páginas de detalle `/condicion/[id]`, `/indicador/[id]` y `/trazabilidad`.
11. Configurar `vercel.json`.
12. Hacer los tests E2E y de accesibilidad, revisar el responsive y el rendimiento (Lighthouse ≥ 90 en Rendimiento y Accesibilidad).
13. Escribir el README: cómo editar los datos manuales, las variables, el despliegue y la checklist marcada. Completar `DECISIONES.md`.
14. Desplegar en Vercel si hay credenciales; si no, dejar el build local verificado.
15. Crear `scripts/collect/gpu-abierto.ts` (J1) con sus tests y `data/auto/`.
16. Crear `scripts/research/*` (J2): las tareas deterministas primero (`nvidia`, `eventos` vía EDGAR, `regulacion` vía Federal Register), después el cliente de Perplexity, la verificación, la escritura y la creación del PR, con los tests de la sección 14 «Mantenimiento».
17. Crear `/api/health?detalle=1` y J3 (`monitor.yml` + `scripts/monitor/*`), con issues deduplicados, cierre automático, webhook y correo.
18. Crear `tests/contract/*`, los snapshots de esquema y J4 (`contracts.yml`), con el agente opcional detrás de `AUTOFIX_AGENT`.
19. Implementar la lógica de ciclo de vida (sección 18.7) en `src/lib/calc/ciclo.ts` y `scripts/research/polymarket-descubrir.ts`.
20. Añadir `ci.yml`, `renovate.json`, `CODEOWNERS`, la plantilla de PR y las etiquetas (`automerge`, `revision-humana`, `monitor`, `contrato`, `autofix`, `suceso`, creadas por `scripts/setup/labels.ts`). Documentar en el README la protección de rama `main` con el check `ci` obligatorio y el auto-merge activado en el repositorio.
21. Escribir el README «Operación»: qué hace cada job, cuándo se ejecuta, cómo pausarlo (`workflow_dispatch` + `gh workflow disable`) y la tabla de la sección 18.9.

---

## 18. Mantenimiento automático (v1.1)

Objetivo: una vez desplegado, el panel se mantiene solo. Ninguna persona tiene que actualizar datos, vigilar fuentes, renovar mercados ni actualizar dependencias. La intervención humana queda reducida a **opcional**: revisar PR etiquetados `revision-humana`, que además tienen su propia regla de resolución automática o un estado por defecto seguro (sección 18.3.5).

Todo el mantenimiento vive en **GitHub Actions** dentro del mismo repositorio. Vercel solo sirve la app.

### 18.1 Tabla consolidada de datos

Columnas:
- **Auto/Man.:** A = conector de la app en tiempo de ejecución; J2 = lo alimenta el job investigador por PR (ya no lo edita una persona); S = estático o semilla.
- **Refresco:** frecuencia del origen (ISR de la app o cron del job).
- **Caché:** `revalidate` de Next en segundos.
- **Caducidad:** antigüedad máxima del último punto antes de marcarlo `stale` (aviso) y `sin_dato` (deja de contar). Para series de mercado se cuenta en días hábiles de EE. UU.

| Dato / indicador | Fuente exacta | Auto/Man. | Refresco | Caché | Stale → sin dato |
|---|---|---|---|---|---|
| Cierres NVDA, SOXX, ^SOX, ^IXIC, TSM, ASML, AVGO, ANET, SMCI, AMD, MRVL, INTC, MU, AMAT, LRCX, KLAC, ANT, IPO, SEMI.L, SEC0.DE, ^TNX (I01-I03, c1-c3, I19-I23, I28, I32, I38, I42) | Yahoo chart v8 `query1/query2.finance.yahoo.com/v8/finance/chart/{s}?period1=0&period2={now}&interval=1d` | A | 15 min + cron tras el cierre | 900 | 2 → 5 días hábiles |
| Acciones en circulación NVDA (I03, I42) | SEC `companyconcept/CIK0001045810/dei/EntityCommonStockSharesOutstanding.json` | A | diaria | 86.400 | 120 → 200 días |
| Probabilidad Polymarket, todos los horizontes (I04, I05) | Gamma `/events?slug=ai-bubble-burst-by` + CLOB `/prices-history` | A | 15 min | 900 | 1 → 3 días |
| Reglamento Polymarket (I06) | Gamma `events[0].description` (hash SHA-256) | A | 15 min | 900 | 7 → 30 días |
| Ingresos trimestrales NVDA (I13) | SEC XBRL `us-gaap/Revenues` | A | diaria | 86.400 | 120 → 200 días |
| Ingresos del último trimestre aún no en XBRL (I13) | SEC 8-K, anexo `*cfocommentary*.htm` / `*pr.htm`: «Revenue for the … quarter was … $X billion» | J2 (determinista) | diaria | — | 120 → 200 días |
| Previsión NVDA (I14) | SEC 8-K de resultados: «Revenue is expected to be $X billion» (verificado en `q3fy27cfocommentary.htm`, 17/11/2026: 130,0 mil M$) | J2 (determinista) | diaria (detecta 8-K nuevos) | — | 120 → 200 días |
| Garantías máximas NVDA (I15) | XBRL `us-gaap/GuaranteeObligationsMaximumExposure`; si el último 10-Q aún no está, la tabla «maximum gross exposure related to our guarantees» del CFO commentary | A + J2 | diaria | 86.400 | 120 → 200 días |
| Garantía mayor y concentración (I16) | Mismo CFO commentary: «up to a maximum of $105 billion» (SB Energy, campus de Ohio, OpenAI 20 años) | J2 (determinista + LLM de respaldo) | diaria | — | 120 → 200 días |
| Acuerdos con neoclouds (I18) | CFO commentary, tabla «Neocloud agreements» | J2 | diaria | — | 120 → 200 días |
| Frentes de Nvidia (I17) | J2 investigador (LLM + web) con URL y cita; fuentes primarias SEC 8-K (Item 5.02 = cambio de directivos) | J2 | diaria | — | sin caducidad (registro de eventos) |
| H100 Silicon Data SDH100RT, oficial (c4, I24) | API de pago si hay `SILICONDATA_API_KEY`; si no, la página pública `silicondata.com/products/silicon-index/h100` leída por J2 con la cita «As of {fecha} {valor} USD / GPU-hour» | A / J2 | diaria | 21.600 | 3 → 7 días hábiles |
| Índice abierto de alquiler H100/B200 (I24b, I26) | RunPod GraphQL, Vast.ai, Azure Retail Prices y AWS (sección 18.2) | A | cada 6 h | 21.600 | 2 → 5 días |
| Eventos c5/c6 (quiebra o adquisición) | J2: SEC EDGAR de Anthropic (CIK 0002130357, 8-K Items 1.03/2.01/5.01), GDELT DOC 2.0 y LLM + web | J2 | diaria | — | sin caducidad |
| Estado de los laboratorios (I27) | Derivado de los eventos y de I28/I29 | J2 | diaria | — | 30 → 90 días |
| Financiación de los laboratorios (I29) | J2: SEC de Anthropic (XBRL `CashAndCashEquivalentsAtCarryingValue`, 8-K) y LLM + web para OpenAI | J2 | semanal (lunes) | — | 45 → 120 días |
| OPV relevantes (I32, complemento) | J2: LLM + web; proxy automático Yahoo `IPO` | A + J2 | semanal | — | 45 → 120 días |
| Bono a 10 años (I30) | FRED `DGS10` (respaldo Yahoo `^TNX`) | A | diaria | 21.600 | 3 → 7 días hábiles |
| Tipo de la Fed (I31) | FRED `DFEDTARU` y `DFEDTARL` | A | diaria | 21.600 | 10 → 30 días |
| Regulación y política (I34) | J2: Federal Register API `federalregister.gov/api/v1/documents.json` (verificada), GDELT y LLM + web | J2 | diaria | — | sin caducidad; la gravedad decae a 180 días |
| Puntocom (I39), composición SOXX (I22), citas del vídeo | `data/seed/*` | S | nunca (la rotación está en la sección 18.6) | build | — |

`/api/health?detalle=1` (con `Authorization: Bearer ${HEALTH_TOKEN}`) devuelve, por cada fila, `{id, fuente, ultimoPunto, edadHoras, umbralStaleH, umbralSinDatoH, estado}`. J3 la usa.

### 18.2 Alternativas gratuitas al índice de pago de Silicon Data (verificadas el 21/11/2026)

| Fuente | Endpoint | Clave | Lo que devuelve (consulta real del 21/11/2026) | Uso |
|---|---|---|---|---|
| **RunPod** (neocloud) | `POST https://api.runpod.io/graphql` con el cuerpo `{"query":"query { gpuTypes { id displayName securePrice communityPrice } }"}` | No | H100 SXM: 4,39 (secure) / 2,69 (community); H100 PCIe: 2,89 / 1,99; H200 SXM: 5,29 / 3,59; B200: 7,99 / 5,98; B300: 8,99 / 6,94 $/GPU·h | Precio de lista, cada 6 h |
| **Vast.ai** (marketplace) | `GET https://cloud.vast.ai/api/v0/bundles/?q={"gpu_name":{"eq":"H100 SXM"},"rentable":{"eq":true},"type":"on-demand","limit":500}` (q codificado en la URL). **Ojo:** `console.vast.ai` devuelve 403 desde servidores; usar `cloud.vast.ai` | No | H100 SXM: 11 ofertas, mediana 2,27, P25 1,73 y mínimo 1,53 $/GPU·h (`dph_total / num_gpus`); B200: 14 ofertas, mediana 8,75 | Precio de mercado real, cada 6 h |
| **Azure Retail Prices** (hiperescalador) | `GET https://prices.azure.com/api/retail/prices?$filter=armSkuName eq 'Standard_ND96isr_H100_v5' and priceType eq 'Consumption' and armRegionName eq 'eastus'` | No (API oficial) | ND96isr H100 v5 (8 GPU): 98,32 $/h → **12,29 $/GPU·h**; spot 18,17 $/h → 2,27 $/GPU·h. GB200: `contains(armSkuName,'GB200')` | Lectura de hiperescalador, diaria |
| **AWS** (hiperescalador) | `GET https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/ec2-ondemand-without-sec-sel/US%20East%20(N.%20Virginia)/Linux/index.json` (gzip; la usa la web de precios de AWS; **no oficial**). Ruta oficial alternativa: Price List Bulk API `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json` (muy pesada, solo en J4) | No | p5.48xlarge (8×H100): 55,04 $/h → **6,88 $/GPU·h**; p6-b200.48xlarge (8×B200): 113,93 → 14,24; p5en: 63,30 | Lectura de hiperescalador, diaria |

Descartadas tras probarlas: Lambda (su API exige clave y la web es HTML sin estructura estable), TensorDock (401 sin clave), Google Cloud Billing Catalog (exige una clave de API de GCP).

**Índice abierto de alquiler (IAA), nuevo indicador I24b:**
- `IAA_neo(gpu) = mediana( RunPod.communityPrice, RunPod.securePrice, Vast.medianaOnDemand )` para `H100 SXM` y `B200`. Con los datos de hoy: H100 = mediana(2,69; 4,39; 2,27) = **2,69 $/h**, frente a los 3,08 de Silicon Data. B200 = mediana(5,98; 7,99; 8,75) = 7,99 $/h, frente a los «casi 10» del vídeo.
- `IAA_hs(gpu)` = la media de Azure y AWS por GPU. Se muestra aparte.
- Cada ejecución guarda un punto por día en `data/auto/gpu_alquiler_abierto.csv`. Lo hace J1 (sección 18.4) mediante un PR con automerge. Así se construye un histórico propio, porque las fuentes solo dan el precio de hoy.
- Una fuente con < 3 ofertas (Vast) o con precio 0 (RunPod devuelve 0 cuando no hay stock) se excluye de la mediana. Si quedan < 2 fuentes, el IAA queda «sin dato».

**Relación con c4 (regla clara):**
1. **c4 oficial** = SDH100RT, de la API con clave o de la página pública leída por J2 con cita verificada. Es lo único que cuenta para el criterio de Polymarket (X/6).
2. **c4 proxy** = IAA_neo H100. Si no hay dato oficial de los últimos 7 días, la proximidad de c4 en el IRP usa el proxy, y la tarjeta muestra «Proxy abierto (no oficial)».
3. Si el proxy marca ≤ 1,20 $/h dos días seguidos, J2 hace una comprobación urgente de la página de Silicon Data y J3 abre un issue «Posible activación de c4».

### 18.3 Job J2: investigador de datos manuales (LLM + búsqueda web)

**Workflow:** `.github/workflows/research.yml`.
- **Disparadores:**
  - `schedule: '30 6 * * *'` (diario, 06:30 UTC): GPU oficial, SEC (8-K nuevos de NVDA y ANT), eventos c5/c6, frentes de Nvidia y regulación;
  - `schedule: '0 7 * * 1'` (lunes): financiación de los laboratorios y OPV;
  - `workflow_dispatch` con el input `tarea`;
  - `repository_dispatch` de tipo `research-urgente` (lo lanza J3).
- `concurrency: research`.
- **Ejecución:** `pnpm tsx scripts/research/run.ts --tareas=<lista>`. Hay una tarea por fichero de `data/manual/`.

**18.3.1 Orden de preferencia por tarea (determinista primero, LLM después):**

| Tarea | Paso determinista | Paso LLM (solo si el determinista no da el dato) |
|---|---|---|
| `nvidia` (I13-I16, I18) | Detectar el 8-K nuevo en `data.sec.gov/submissions/CIK0001045810.json`. Abrir el índice `Archives/edgar/data/1045810/{acc}/index.json` y localizar `*cfocommentary*.htm` y `*pr.htm`. Pasar las regex sobre el texto plano: `/Revenue for the (first\|second\|third\|fourth) quarter was a record \$([\d.]+) billion, up (\d+)% from a year ago/`, `/Revenue is expected to be \$([\d.]+) billion/`, `/up to a maximum of \$([\d.]+) billion/` y la tabla de garantías | Extraer de ese mismo documento (se pasa el texto, sin búsqueda web) |
| `gpu_oficial` (c4) | API de Silicon Data si hay clave | Leer la página pública de Silicon Data y extraer el valor y la fecha con cita literal |
| `eventos` (c5/c6) | EDGAR de ANT (CIK 0002130357): 8-K con Items 1.03 (quiebra), 2.01 (adquisición completada) o 5.01 (cambio de control). GDELT `https://api.gdeltproject.org/api/v2/doc/doc?query=("OpenAI" OR "Anthropic") (bankruptcy OR "chapter 11" OR acquired OR acquisition)&mode=artlist&format=json&timespan=2d&maxrecords=50` (gratuita y sin clave; máximo 1 petición cada 5 s. En la prueba del 21/11/2026 respondió con el aviso de límite de uso en texto plano en lugar de JSON, así que es **opcional**: si la respuesta no es JSON, se reintenta una vez a los 10 s y luego se continúa solo con EDGAR y el LLM) | Confirmar o descartar cada candidato con búsqueda web |
| `frentes_nvidia` | 8-K de NVDA con Item 5.02 (directivos) y 8.01 | Buscar novedades de SEC, dirección y financiación a clientes |
| `regulacion` | Federal Register API: `https://www.federalregister.gov/api/v1/documents.json?conditions[term]="data center" OR "artificial intelligence" OR semiconductor&order=newest&per_page=50&conditions[publication_date][gte]={hace 2 días}` (verificada, sin clave; el OR se escribe con `|`: `"data center" | "artificial intelligence" | semiconductor`; devuelve mucho ruido, que filtra el LLM) | Clasificar el efecto y la gravedad, y buscar anuncios no normativos |
| `financiacion_labs` | XBRL de ANT (efectivo) y 8-K de ANT | Rondas y deuda de OpenAI y Anthropic de los últimos 14 días |
| `opv` | — | OPV de empresas de IA o de infraestructura de IA en los últimos 14 días |


**18.3.2 Modelo, clave y llamada**
- **Proveedor y modelo:** Perplexity API, modelo `sonar-pro` (variable `RESEARCH_MODEL`). Incluye búsqueda web y devuelve `citations` y `search_results`.
- **Clave:** `PERPLEXITY_API_KEY`.
- **Endpoint:** `POST https://api.perplexity.ai/chat/completions` (responde 401 sin clave; verificado). Cuerpo:
  - `temperature: 0`;
  - `response_format: {type:"json_schema", json_schema:{schema: <esquema zod convertido con zod-to-json-schema>}}`;
  - `search_recency_filter: "week"` para las tareas diarias y `"month"` para las semanales.
- **Coste:** se registra `usage` por llamada en `logs/research/{fecha}.json`, que va dentro del PR. Si el coste estimado del día supera `RESEARCH_MAX_USD_DIA`, el job se detiene y abre un issue.
- **Sin `PERPLEXITY_API_KEY`:** los pasos LLM se omiten, los deterministas siguen y J3 avisa una vez por semana de que «el investigador funciona en modo reducido».

**18.3.3 Prompt del investigador** (plantilla en `scripts/research/prompt.md`; `{…}` se rellena por tarea)

```
Eres un verificador de datos para el "Panel de control del pinchazo de la IA". Tarea: {tarea}.
Busca SOLO hechos ocurridos entre {desde} y {hasta} sobre: {descripcion_tarea}.
Reglas obligatorias:
1. No inventes nada. Si no encuentras una fuente que lo diga explícitamente, devuelve "items": [].
2. Cada item debe incluir "fuente_url" (la página exacta, no una portada ni un buscador) y "cita": un fragmento
   LITERAL copiado de esa página (entre 40 y 400 caracteres) que contenga la cifra o el hecho. No parafrasees la cita.
3. Las cifras van en la unidad pedida ({unidad}); indica "fecha_dato" (a qué fecha se refiere) y "fecha_publicacion".
4. Prefiere fuentes primarias (sec.gov, federalregister.gov, notas de prensa oficiales de la empresa) y, si no,
   medios de la lista: {dominios_permitidos}. Indica "tipo_fuente": "primaria" | "medio" | "otro".
5. Rumores, opiniones, previsiones de analistas y titulares condicionales ("could", "may", "considering") NO son
   hechos: márcalos "es_rumor": true.
6. Para quiebras o adquisiciones: solo cuenta una declaración formal (presentación del concurso o chapter 11 ante un
   tribunal, o adquisición firmada o completada). Un acuerdo de inversión minoritaria NO es una adquisición.
7. Devuelve exclusivamente JSON válido con este esquema: {json_schema}.
Datos que ya tenemos (no los repitas salvo que cambien): {resumen_existente}.
```

`descripcion_tarea` por tarea:

| Tarea | `descripcion_tarea` |
|---|---|
| `eventos` | «quiebra, concurso de acreedores, chapter 11 o administración judicial de OpenAI o de Anthropic; adquisición o toma de control de OpenAI por otra empresa» |
| `frentes_nvidia` | «cambios en la dirección de Nvidia; investigaciones de la SEC u otros reguladores sobre Nvidia; cambios en la financiación o garantías de Nvidia a clientes (neoclouds, OpenAI)» |
| `regulacion` | «normas, órdenes ejecutivas, leyes o anuncios oficiales de EE. UU. o la UE que frenen, graven o restrinjan centros de datos de IA o la exportación de chips» |
| `financiacion_labs` | «rondas, emisiones de deuda, OPV o líneas de crédito de OpenAI o Anthropic, con importe en millones de USD» |
| `opv` | «salidas a bolsa de empresas de IA o de infraestructura de IA, aplazadas o retiradas incluidas» |
| `gpu_oficial` | «valor del índice Silicon Data H100 (SDH100RT) publicado en https://www.silicondata.com/products/silicon-index/h100, con la fecha "As of"» |

`dominios_permitidos` (en `config.ts`, ampliable):
- fuentes primarias y oficiales: sec.gov, federalregister.gov, whitehouse.gov, commerce.gov, bis.gov, europa.eu, boe.es;
- empresas: nvidia.com, openai.com, anthropic.com, silicondata.com;
- medios: reuters.com, bloomberg.com, ft.com, wsj.com, cnbc.com, apnews.com, nytimes.com, theverge.com, techcrunch.com, theinformation.com, axios.com, expansion.com, cincodias.elpais.com.

**18.3.4 Verificación (código determinista, nunca el LLM)**

Para cada item propuesto:
1. **Esquema:** pasa el esquema zod de su fichero. Si no, se descarta y se anota en el log.
2. **URL viva:** `GET fuente_url` devuelve 200, con redirecciones permitidas y User-Agent de navegador.
3. **Cita literal:** se normaliza el HTML de la página (quitar etiquetas, `html.unescape`, espacios colapsados, comillas tipográficas convertidas en rectas, minúsculas) y la cita normalizada debe ser **subcadena** de la página. Si la página exige JavaScript o devuelve paywall, se acepta solo si aparece en `search_results[].snippet` de la propia respuesta y `tipo_fuente` es `primaria` o `medio`. En ese caso se marca `cita_verificada:"snippet"`, que obliga a revisión humana en c5/c6.
4. **Cifra dentro de la cita:** el número del campo (en cualquier formato: 130.0, 130, 130,000) aparece en la cita.
5. **Fechas:** `fecha_dato` ≤ hoy y dentro de la ventana pedida.
6. **Duplicados:** misma entidad, tipo y fecha ±3 días, o misma URL → se fusiona.
7. **Rango plausible:**

| Dato | Rango plausible | Variación máxima sin revisión |
|---|---|---|
| H100 $/h (oficial o abierto) | 0,30–20 | ±25 % frente al último valor |
| B200 $/h | 1–40 | ±25 % |
| Ingresos trimestrales NVDA | 10.000–400.000 M$ | ±40 % trimestral |
| Previsión NVDA | 10.000–400.000 M$ | ±40 % frente a los últimos ingresos |
| Garantías NVDA | 0–500.000 M$ | ±30 % |
| Ronda o OPV de un laboratorio | 100–300.000 M$ | — |
| Gravedad (frentes, regulación) | 1–3 | — |

Los items que superan los pasos 1-6 se escriben en `data/manual/*.json` con `verificado:true`, `cita`, `fuente_url`, `cita_verificada:"pagina"|"snippet"`, `origen:"J2"`, `modelo` y `fecha_alta`. Los que no superan el paso 7 se escriben igual pero con `requiere_revision:true`.

**18.3.5 PR, automerge y revisión**
- El job crea la rama `bot/research-{fecha}-{tarea}` y abre el PR con `peter-evans/create-pull-request@v7`. El cuerpo es una tabla con cada item (dato, valor, URL, cita y verificación) y el coste.
- **Automerge** (etiqueta `automerge` + `gh pr merge --auto --squash`, que se mergea cuando CI pasa) si se cumple TODO esto:
  - CI en verde;
  - todos los items tienen `cita_verificada:"pagina"`;
  - todos están dentro del rango y de la variación máxima;
  - ningún item es de tipo `quiebra` o `adquisicion_openai`;
  - ninguno cambia el `estado` de un laboratorio a `tension` o `evento`;
  - ninguno tiene gravedad 3;
  - no se borra ni se modifica ningún item existente (solo altas).
- **Revisión** (etiqueta `revision-humana`, sin automerge) en cualquier otro caso. El panel **no** usa los datos de un PR no mergeado.
- **Resolución sin persona:**
  - un PR `revision-humana` que no es de c5/c6 se **cierra solo a los 14 días** (el dato se queda fuera y el panel sigue con el anterior, marcado `stale` cuando toque);
  - los de c5/c6 siguen la regla de D9.
- Protección de rama `main`: los checks de CI son obligatorios. CODEOWNERS = el propietario del repositorio, solo sobre `data/manual/eventos.json`.

**18.3.6 Reglas de activación de c5 y c6 (sustituyen a D9 v1.0)**
- **Regla A, fuente primaria (automerge permitido):**
  - Anthropic: 8-K en EDGAR (CIK 0002130357) con Item 1.03 «Bankruptcy or Receivership» → c5 (quiebra); con Item 2.01/5.01 por adquisición o cambio de control → no cuenta (c6 es solo OpenAI), pero se registra.
  - OpenAI (privada): un comunicado en `openai.com` que contenga «Chapter 11», «bankruptcy» o «acquired by», o un registro judicial público (por ejemplo, `restructuring.ra.kroll.com`, `cases.stretto.com`, `dm.epiq11.com`, `omniagentsolutions.com`), con la cita verificada en la página.
- **Regla B, consenso de medios:** ≥ 3 medios distintos de `dominios_permitidos`, con citas verificadas en página y publicados en ≤ 72 h, sin contradicciones (ningún item de esas 72 h con un desmentido, «denies» o «not in talks») y ningún `es_rumor`. El PR queda en `revision-humana`. Si en `C56_AUTOMERGE_TIMEOUT_H` horas (72 por defecto) nadie lo ha cerrado y J2 vuelve a confirmar la regla B en su ejecución diaria, J2 lo aprueba y lo mergea. Con `C56_AUTOMERGE_TIMEOUT_H=0` nunca se mergea solo.
- **Cualquier otro caso:** no se activa. Se muestra como «Posible suceso en investigación» en la tarjeta (J2 lo escribe, con sus fuentes, en `data/auto/candidatos_c56.json` mediante un PR aparte con automerge: ese fichero nunca activa condiciones) y no cuenta para X/6 ni para el IRP.

### 18.4 Job J1: recolector diario del índice abierto de GPU
- **Workflow:** `.github/workflows/collect.yml`, `schedule: '15 */6 * * *'`.
- Ejecuta `scripts/collect/gpu-abierto.ts`: llama a RunPod, Vast, Azure y AWS (sección 18.2), calcula IAA_neo e IAA_hs para H100 y B200 y añade una fila por día a `data/auto/gpu_alquiler_abierto.csv` (si el día ya existe, se reemplaza: queda el último valor del día).
- Formato del CSV: `fecha,gpu,lectura,valor,fuentes_usadas,detalle_json`.
- Commit en la rama `bot/collect`, con PR y automerge (mismas condiciones de CI; rango 0,3–40 $/h; si no, `revision-humana`).
- Si alguna fuente falla, la fila se escribe con las que haya y `fuentes_usadas` lo refleja. Si quedan < 2 fuentes, no se escribe la fila y se anota en el log del job, que J3 lee.

### 18.5 Job J3: monitorización y alertas
- **Workflow:** `.github/workflows/monitor.yml`, `schedule: '0 */3 * * *'` y después de cada despliegue (`deployment_status` correcto).
- **Comprobaciones:**
  1. `GET {SITE_URL}/api/health` → 200 en < 10 s.
  2. `GET {SITE_URL}/api/health?detalle=1` → ningún dato en `sin_dato` y lista de `stale` (umbrales de la sección 18.1).
  3. `GET {SITE_URL}/` → 200 y contiene «Panel de control del pinchazo de la IA».
  4. Último run de J1 y J2 con `conclusion=success` en las últimas 26 h (J1) y 26 h o 8 días (J2), consultado vía `gh run list`.
  5. Polymarket: `reglasCambiadas=false` y existe al menos un mercado abierto en el evento.
  6. No hay PR `revision-humana` de más de 7 días (para avisar; el cierre automático está en 18.3.5).
- **Al fallar:** abre o actualiza un issue con la etiqueta `monitor`, el título `[monitor] {comprobación}: {resumen}` y un cuerpo con el detalle y el enlace al run. Se deduplica por título: si ya existe abierto, añade un comentario y no crea otro. **Cierra el issue automáticamente** cuando la comprobación vuelve a pasar dos ejecuciones seguidas.
- **Avisos externos opcionales:**
  - si existe `ALERT_WEBHOOK_URL`: `POST` JSON `{texto, nivel:"error"|"aviso", issue_url}`;
  - si existen `RESEND_API_KEY` y `ALERT_EMAIL_TO`: correo con el asunto `[Panel pinchazo IA] {título}`.
  - Solo en la apertura y en el cierre del issue, nunca en cada ejecución.
- **Disparo de urgencias:** si el proxy de c4 ≤ 1,20 $/h o si `/api/snapshot` muestra un nuevo suceso de c1-c3 → `repository_dispatch` `research-urgente` (J2) y un issue informativo `[suceso]`.

### 18.6 Job J4: autorreparación semanal (contratos de API)
- **Workflow:** `.github/workflows/contracts.yml`, `schedule: '0 5 * * 0'` (domingo) y `workflow_dispatch`.
- `pnpm vitest run tests/contract` llama **en vivo** a cada endpoint (Yahoo `NVDA`, Polymarket Gamma y CLOB, SEC companyconcept y submissions, FRED, RunPod, Vast, Azure, AWS, Federal Register y Silicon Data si hay clave) y valida la respuesta contra el mismo esquema zod que usa el conector.
- Por cada fallo:
  - genera un «esquema observado» (claves y tipos de la respuesta con la función propia `inferirEsquema(obj)` de `scripts/contract/infer.ts`, sobre una muestra recortada) y lo compara con `tests/contract/snapshots/{fuente}.schema.json`;
  - abre un issue `[contrato] {fuente} ha cambiado de formato`, con la etiqueta `contrato`, el diff en bloque `diff`, la respuesta recortada (máximo 5 KB) y el conector afectado.
- **Agente opcional** (`AUTOFIX_AGENT=on`): lanza un agente de código, por ejemplo `anthropics/claude-code-action` (con `ANTHROPIC_API_KEY`) o un equivalente con `OPENAI_API_KEY`. Las instrucciones son: «Ajusta src/lib/connectors/{fuente}.ts y su esquema al nuevo formato del diff adjunto; actualiza el fixture y el snapshot; no toques otros ficheros; todos los tests deben pasar». El agente abre un PR con la etiqueta `autofix` y `revision-humana`, **sin automerge nunca**. Si nadie lo mergea, el panel sigue sirviendo el último dato `stale` y J3 mantiene el issue abierto.
- Si no hay fallos, se actualizan los snapshots de esquema solo cuando haya campos **nuevos** (añadir no rompe), mediante un PR con automerge.

### 18.7 Ciclo de vida
1. **Mercados de Polymarket (amplía D5):**
   - en cada snapshot se leen **todos** los mercados del evento `ai-bubble-burst-by`;
   - J2 hace además un descubrimiento semanal de eventos nuevos con `GET https://gamma-api.polymarket.com/public-search?q=AI%20bubble%20burst&limit_per_type=20` (verificado: devuelve el evento `ai-bubble-burst-by`) y `q=AI%20industry%20downturn`, filtrando los que tengan `description` con «at least three of the following events»;
   - si aparece un evento o un mercado nuevo, J2 abre un PR que lo añade a `config.polymarket.eventos`. Hay automerge si el hash del reglamento coincide con el conocido; si no coincide, `revision-humana` y un issue «Reglamento distinto».
   - El **mercado principal** es siempre el abierto (`closed=false`) con el `endDate` más próximo. La **fecha límite** de la ventana pasa a ser su `endDate`, ya no la constante 31/12/2026.
2. **Ventana de 90 días:** se recalcula en cada snapshot. Los sucesos de hace más de 90 días frente al suceso más reciente dejan de estar «en ventana», pero siguen en el histórico (`data/auto/sucesos.csv`, que J1 escribe cuando detecta un cruce en el snapshot).
3. **Cambios de trimestre de la SEC:**
   - cuando aparece un 8-K de resultados nuevo de NVDA, J2 extrae los ingresos y la previsión del nuevo trimestre;
   - cuando aparece el 10-Q o 10-K con XBRL del mismo periodo, la app prefiere XBRL y el dato de J2 queda como histórico;
   - si el valor de XBRL y el de J2 difieren > 1 %, J3 abre un issue;
   - el trimestre fiscal se deriva de `fp`/`fy` de XBRL, sin fechas fijas en el código.
4. **Fin de 2026:**
   - el 01/01/2027 (hora ET) el mercado de 2026 se cierra o resuelve;
   - la app pasa automáticamente al siguiente mercado abierto (hoy, junio de 2027) y muestra en M2 la resolución del anterior («Resuelto: Sí/No», según `outcomePrices` de 1 o 0);
   - si no queda ningún mercado abierto: M2 muestra «Sin mercado activo», el contador X/6 sigue calculándose sobre una ventana móvil de 90 días que termina hoy y J3 abre un issue «Sin mercado Polymarket activo» (aviso, no error).
5. **Rotación de las semillas del vídeo:**
   - cada semilla con `fuente:"video"` tiene `caduca_en` (por defecto, la fecha del vídeo + 90 días; para la H100, + 7 días);
   - cuando existe un dato verificado de J2 o de un conector para el mismo indicador y periodo, o más reciente, la semilla deja de mostrarse como valor actual y pasa a la pestaña «Histórico del vídeo»;
   - pasado `caduca_en` sin sustituto, el indicador muestra «Sin dato reciente (último dato del vídeo: …)» y J3 lo lista como `stale`;
   - las citas del vídeo (`citas.json`) no caducan, porque son contexto.
6. **Reglas de umbrales:** los umbrales (P) no se recalibran solos en la v1.1, para evitar deriva silenciosa.

### 18.8 Dependencias, CI y despliegue
- **CI** (`.github/workflows/ci.yml`, en `pull_request` y `push` a `main`):
  - `pnpm install --frozen-lockfile`;
  - `pnpm lint`, `pnpm typecheck` y `pnpm test` (unitarios);
  - `pnpm test:manual-data` (valida con zod todo `data/manual` y `data/auto`);
  - `MOCK_DATA=1 pnpm build` y `MOCK_DATA=1 pnpm e2e` (Playwright con Chromium y axe).
  - Usa caché de pnpm y de los navegadores de Playwright. Es el check obligatorio en la protección de `main`.
- **Renovate** (GitHub App; `renovate.json`):
```json
{
  "extends": ["config:recommended", ":semanticCommits"],
  "timezone": "Europe/Madrid",
  "schedule": ["before 6am on monday"],
  "packageRules": [
    { "matchUpdateTypes": ["patch", "pin", "digest"], "automerge": true, "automergeType": "pr", "platformAutomerge": true },
    { "matchUpdateTypes": ["minor"], "matchCurrentVersion": "!/^0/", "automerge": true, "minimumReleaseAge": "3 days" },
    { "matchUpdateTypes": ["major"], "automerge": false, "labels": ["revision-humana"] },
    { "matchManagers": ["github-actions"], "automerge": true }
  ],
  "lockFileMaintenance": { "enabled": true, "automerge": true, "schedule": ["before 6am on the first day of the month"] }
}
```
- Las versiones mayores (Next, React, Tailwind) quedan en revisión. Si se acumulan más de 90 días sin mergear, J3 abre un aviso. El panel sigue funcionando con la versión anterior, así que no es un bloqueo.
- **Despliegue:**
  - con la integración Git de Vercel, cada merge a `main` despliega a producción y cada PR tiene su preview;
  - J3 se dispara con `deployment_status` y verifica la producción;
  - si J3 falla justo después de un despliegue (la comprobación 1 o 3 falla 2 veces seguidas en 15 min), ejecuta `vercel rollback` (requiere `VERCEL_TOKEN`; si no existe, solo abre un issue).

### 18.9 Qué sigue necesitando a una persona
Nada es imprescindible para que el panel siga funcionando. Quedan como **opcionales**, con su comportamiento por defecto si nadie actúa:

| Caso | Si nadie actúa |
|---|---|
| PR `revision-humana` de datos fuera de rango | Se cierra a los 14 días; el dato se queda fuera |
| c5/c6 por la regla B | Se mergea a las 72 h si J2 lo reconfirma (configurable; `0` = nunca) |
| Arreglo de un contrato roto (J4) | El dato afectado queda `stale` y el issue sigue abierto. Esta es la única degradación real sin persona, y el agente opcional la propone resuelta |
| Actualizaciones mayores de dependencias | Siguen en la versión anterior |
| Altas de cuentas y claves (Vercel, GitHub, Perplexity, y opcionalmente Silicon Data, Resend o webhook) | Se hacen una sola vez, al instalar |

---

## Apéndice A. Trazabilidad: afirmación del vídeo → panel

| mm:ss | Afirmación del vídeo | Panel |
|---|---|---|
| 00:00 | Nasdaq −5,3 % en una sesión | I02 (M1) |
| 00:05 | Nasdaq −10 % o más en la semana | I02 |
| 00:11 | Casi −20 % desde máximos = mercado bajista técnico | I01 |
| 00:24 | NVDA −22 % en la semana, más de 1 billón $ | I03 |
| 00:35 | NVDA casi −50 % desde máximos | c1, I03 |
| 00:41 | Se teme el pinchazo de la burbuja de la IA | M0, título |
| 00:53 | Polymarket supera el 50 % en un día (2026, no 2027/2028) | I04, I05 |
| 01:32 | Funcionamiento del contrato: paga 1 $; 55 ¢ = 55 % | I04, ayuda |
| 02:18 | Hace falta una parametrización sin ambigüedad | I06 |
| 03:24 | 3 de 6 sucesos en 90 días antes del 31/12/2026 | Sección 4, VentanaTimeline |
| 03:48 | C1 NVDA −50 % | c1 |
| 03:55 | C2 SOXX −40 % | c2 |
| 04:06 | C3 TSMC/ASML/Broadcom/Arista/Supermicro −50 % | c3, I23 |
| 04:22 | C4 H100 ≤ 1 $/h durante 5 días (Silicon Data) | c4, I24 |
| 04:36 | C5 quiebra de OpenAI o Anthropic | c5, I27 |
| 04:39 | C6 adquisición de OpenAI | c6, I27 |
| 04:57 | Bloques financiero (1-3) y real (4-6) | M3, subíndices F y R |
| 05:21 | Las financieras están cerca; las reales, lejos | I35, I36 |
| 05:38 | Nvidia diseña la mayoría de los chips; su cotización = apuesta por la inversión en IA | c1, ayuda |
| 05:55 | ATH 239,2 $ el 6 de octubre; cierre 125,5 $ (−47 %) | c1 |
| 06:16 | Umbral (≈119,6 $); falta un 5 % | c1, distancia restante |
| 06:26 | Caída tras unos resultados excelentes | I13 |
| 06:36 | Ingresos de 115.800 M$ (+103 %) | I13 |
| 06:44 | Previsión de 130.000 M$ | I14 |
| 06:47 | El mercado duda de las ventas futuras | I36, evidencias |
| 07:05 | Tres frentes: dirección, regulación y financiación | I17 |
| 07:15 | Salida de Jensen Huang (Megaspeed) | I17, dirección |
| 07:26 | SEC: dos investigaciones (civil y contable); China y financiación | I17, regulación; I34 |
| 08:05 | Nvidia financia y avala a sus clientes | I15 |
| 08:12 | Garantías de 118.000 M$, de ellas 105.000 M$ en el campus de Ohio (OpenAI, 20 años) | I15, I16 |
| 08:27 | Si OpenAI no paga, Nvidia asume los alquileres | I16, ayuda |
| 08:37 | Acuerdos circulares con neoclouds; «Nvidia como un banco» | I18 |
| 09:02 | La nueva CEO reevaluará las prácticas de financiación | I17, I33 |
| 09:16 | Sin financiación para los clientes → menos ventas | I37 |
| 09:28 | SOXX: 30 empresas, ejemplos, tope del 8 % | I22, c2, ayuda |
| 10:12 | El SOXX distingue empresa frente a sector | I19 |
| 10:22 | Máximo de 218,3 $ el 22/06; umbral 131 $ | c2 |
| 10:36 | Cierre de 123,3 $, −43,5 %: condición cumplida, la primera | c2, VentanaTimeline |
| 10:57 | −35 % en 2 meses; solo superado en septiembre de 2001 | I20 |
| 11:20 | ETF iShares MSCI Global Semiconductors (~260 empresas) | I21 |
| 11:59 | Mención de Freedom24 (patrocinio) | Excluida (D10) |
| 12:51 | Función de cada proveedor | c3, ayuda; I23 |
| 13:13 | C3 lejos; Broadcom −37 %, ASML −36 %, TSMC −34 %, Arista −23 % | I23 |
| 13:38 | Broadcom 305 $; umbral 241 $ | I23, fila destacada |
| 13:53 | Balance: 1 cumplida, 1 cerca, 1 plausible | M3, resumen del bloque |
| 14:36 | Las condiciones reales están muy lejos | R, I36 |
| 14:52 | H100 = el indicador más significativo; mide la economía real | c4, peso en R |
| 15:18 | Con exceso de capacidad, sería el primer precio en hundirse | I24, ayuda; I40 |
| 15:26 | 3,1 $/h hoy, 2,88 $ hace un mes, ~2 $ en diciembre de 2025: +50 % en 11 meses | I24 |
| 15:53 | La H100 ya no es puntera y debería abaratarse | I25 |
| 16:15 | La B200 cuesta casi 10 $/h | I26 |
| 16:27 | La demanda de cómputo crece más que la capacidad | I25, I36 |
| 16:47 | Quiebra de los laboratorios poco verosímil | c5, I27 |
| 17:00 | Los laboratorios alquilan casi toda la capacidad | I37 |
| 17:15 | Anthropic: OPV a 83 $ y más de 81.000 M$ captados | I28, I29 |
| 17:22 | OpenAI ha captado decenas de miles de millones en 2026 | I29 |
| 17:34 | Fragilidades en sus arquitecturas financieras | I29, nota; I37 |
| 17:50 | Adquisición de OpenAI = venta de urgencia, improbable | c6 |
| 18:10 | Resultado partido: chips en bolsa frente a alquiler sólido | I35 |
| 18:38 | Escenario 1: pánico financiero sin reflejo real | I36 (E1) |
| 18:48 | Con sobrecapacidad: chips ociosos y alquiler a la baja | I24, I40 |
| 19:03 | La Fed sube los tipos | I31 |
| 19:05 | Bono a 10 años en torno al 5 % | I30 |
| 19:10 | Nvidia se repliega como financiadora | I33 |
| 19:14 | Se estrecha la ventana de OPV | I32 |
| 19:17 | Victoria demócrata en las de mitad de mandato → temor a frenar los centros de datos | I34 |
| 19:25 | Baja el valor presente de la inversión, no la utilidad de los chips | M10, texto E1 |
| 19:39 | Una escasez futura revaloriza el cómputo presente | I25, M10 |
| 19:52 | Como mucho, burbuja financiera de valoraciones | I36 (E1), M0 |
| 20:26 | Los laboratorios siguen tirando; peores perspectivas para los proveedores de chips | I35 |
| 20:49 | Escenario 2: la bolsa anticipa a la economía real | I36 (E2) |
| 20:54 | El alquiler refleja la escasez de hoy; la bolsa, la capacidad en camino | M10, texto E2 |
| 21:08 | Puntocom: Nasdaq desde marzo de 2000; la fibra cae después | I38 |
| 21:19 | Enlace LA–NY: 1,8 M$, 590.000 $ y «4.000 $» | I39 |
| 21:33 | El ancho de banda submarino se triplicó en 2000 y en 2001 | I39 |
| 21:43 | La capacidad creció aún más; quiebra de Global Crossing | I39, I40 |
| 22:11 | Lo financiero y lo real están interconectados | I37 |
| 22:32 | Laboratorios con pérdidas dependen de financiación; si se cierra, cae el alquiler | I37, P |
| 22:56 | Lo financiero puede provocar el pinchazo real | I37, texto |
| 23:04 | Hoy los datos apuntan al escenario 1 (tipos, sobrerregulación) | I36, verificado con el fixture de la sección 6.3 |
| 23:34 | No se descarta el escenario 2 antes de fin de año | M10, «evidencias a vigilar» |
| 23:50 | Lo que pincha es la valoración bursátil | M0, diagnóstico |
| 23:57 | Casi 3 billones $ evaporados en NVDA | I42 |
| 24:03 | Peor racha de los semiconductores desde 2001 | I20 |
| 24:08 | La revolución de la IA, cada vez más innegable; ¿están justificados los precios y la estructura? | M12, texto de cierre |

## Apéndice B. Correcciones a los subtítulos automáticos

| mm:ss | Subtítulo | Corrección | Base |
|---|---|---|---|
| 00:00 | «batacao» | batacazo | contexto |
| 06:16 | «por debajo de los $10» | ≈119,6 $ (50 % de 239,24) | cálculo |
| 07:17 | «Jensen Wang» | Jensen Huang | nombre |
| 09:28 | «Soc», «Socks», «Sox» | SOXX | reglamento de Polymarket |
| 10:39 | «$13,3» | 123,3 $ (Yahoo: 123,40) | cálculo y dato |
| 11:23 | «Eshaves» | iShares | descripción del vídeo |
| 13:23 | «[…] está un 37 %» | Broadcom −37 % | Yahoo: AVGO −36,8 % |
| 15:41 | «en diciembre de 2025 en apenas $.» | cifra inaudible (≈2 $ según el «+50 % en 11 meses») | dudoso |
| 21:27 | «$4,000 en 2002» | dudoso (¿40.000 $?) | dudoso |
| varios | «Onehropic», «Antropic», «Open I», «Polyarket», «burbujadelas.com», «Lamp research», «Marvel» | Anthropic, OpenAI, Polymarket, burbuja de las puntocom, Lam Research, Marvell | — |

---

## Apéndice C. Prompt listo para pegar en el LLM constructor

```
Eres un agente de código autónomo. Construye, prueba y (si hay credenciales) despliega en Vercel la aplicación
"Panel de control del pinchazo de la IA" y TODO su mantenimiento automático, siguiendo AL PIE DE LA LETRA el
documento ESPECIFICACION.md (versión 1.1) adjunto.

Reglas:
1. No hagas preguntas. Si algo no está definido, aplica la sección 15 "Decisiones ya tomadas"; si tampoco está,
   elige la opción más simple que cumpla los criterios de aceptación (sección 14) y anótala en DECISIONES.md.
2. Nunca inventes datos: si una fuente falla o no existe, muestra "Sin dato" o el último dato con aviso de antigüedad.
   Las cifras del vídeo solo entran como semilla etiquetada "Dato del vídeo, sin verificar" y caducan (sección 18.7.5).
   Todo dato que venga del investigador con LLM (J2) necesita fuente_url y cita literal verificada por código.
3. Stack fijo: Next.js 15 App Router + TypeScript estricto + Tailwind 4 + Recharts + zod + Vitest + Playwright, pnpm, Node 20.
   Sin base de datos, sin login. Mantenimiento en GitHub Actions + Renovate; despliegue en Vercel por integración Git.
4. Sigue el orden de la sección 17 (pasos 1-21). Primero los cálculos (src/lib/calc) con sus tests y fixtures,
   después los conectores (sección 7 y 18.2), después la UI (secciones 3, 9 y 10), después los jobs J1-J4, CI y Renovate
   (sección 18).
5. Toda la interfaz en español de España, formato es-ES, modo oscuro por defecto, responsive, WCAG 2.2 AA.
6. Implementa las 6 condiciones exactamente como en la sección 4 (ventana de 90 días y regla "heredada"), los indicadores
   de la sección 5 (más I24b), el IRP de la sección 6, el diagnóstico (I36) y la tabla consolidada de datos de la 18.1
   (con /api/health?detalle=1).
7. Las condiciones c5 y c6 SOLO se activan con las reglas A o B de la sección 18.3.6. Ningún PR de c5/c6 se mergea sin
   cumplirlas. Los PR del agente de autorreparación nunca se mergean solos.
8. /trazabilidad renderiza el Apéndice A completo; M12 muestra las limitaciones de la sección 16.
9. Termina cuando `pnpm build`, `pnpm test`, `pnpm e2e` y los tests de mantenimiento pasen, los workflows pasen actionlint,
   renovate.json sea válido y el README contenga la checklist de aceptación (incluida la de mantenimiento) marcada.
   Entrega: repositorio, URL de despliegue (o instrucciones de `vercel deploy`), lista de secretos que hay que dar de alta
   (sección 12) y resumen de limitaciones (sección 16).
```

# Panel de control del pinchazo de la IA

Aplicación web (Next.js 15) que sigue en tiempo casi real los **seis criterios con los que Polymarket define el «pinchazo de la burbuja de la IA»**, los indicadores de contexto del análisis de Juan Ramón Rallo del 21/11/2026 ([vídeo](https://www.youtube.com/watch?v=JC5wHXu8f7I)) y un **Índice de Riesgo de Pinchazo (IRP)** con diagnóstico de escenario.

> Panel informativo. No es una recomendación de inversión.

La especificación completa está en [`ESPECIFICACION.md`](ESPECIFICACION.md) y las decisiones tomadas durante la construcción, en [`DECISIONES.md`](DECISIONES.md).

## Puesta en marcha

Requisitos: Node 20 o superior y pnpm 10.

```bash
pnpm install
cp .env.example .env.local     # rellena SEC_USER_AGENT, CRON_SECRET y HEALTH_TOKEN
pnpm dev                        # http://localhost:3000 (datos reales)
MOCK_DATA=1 pnpm dev            # con los datos de prueba de tests/fixtures
```

| Comando | Qué hace |
|---|---|
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm test` | Tests unitarios (cálculos, conectores, snapshot) |
| `pnpm test:maintenance` | Tests de los jobs de mantenimiento |
| `pnpm test:manual-data` | Valida con zod `data/manual` y `data/auto` |
| `pnpm test:contract` | Contratos de API **en vivo** (necesita red) |
| `pnpm e2e` | Playwright + axe (requiere `MOCK_DATA=1 pnpm build` antes) |
| `pnpm lint` / `pnpm typecheck` | ESLint y TypeScript |
| `pnpm fixtures` | Regenera los fixtures sintéticos |

## Rutas

- `/` portada con los módulos M0-M12 (anclas `#resumen`, `#termometro`, `#polymarket`, `#condiciones`, `#nvidia`, `#semis`, `#proveedores`, `#computo`, `#laboratorios`, `#financiacion`, `#escenarios`, `#puntocom`, `#metodologia`).
- `/condicion/c1` … `/condicion/c6`, `/indicador/I01` … `/indicador/I42`, `/trazabilidad`.
- `/api/snapshot` (JSON completo), `/api/health` (200 si ≥ 50 % de conectores bien; `?detalle=1` con `Authorization: Bearer $HEALTH_TOKEN`), `/api/cron/refresh` (con `Authorization: Bearer $CRON_SECRET`).

## Cómo editar los datos manuales

Los datos que no tienen API viven en `data/manual/` (JSON con `{"_ayuda": "…", "items": [...]}` y un CSV). Edita el fichero, haz commit y Vercel redespliega. Un fichero que no cumple el esquema hace fallar los tests y el build.

| Fichero | Qué contiene |
|---|---|
| `eventos.json` | Quiebra de OpenAI/Anthropic (c5) o adquisición de OpenAI (c6). Solo cuentan con `verificado: true`. |
| `laboratorios.json` | Estado `normal` / `tension` / `evento` de cada laboratorio. |
| `nvidia.json` | Último trimestre aún no publicado en XBRL, previsión, garantías y concentración. |
| `frentes_nvidia.json` | Eventos de dirección, regulación y financiación (gravedad 1-3). |
| `financiacion_labs.json`, `opv.json`, `regulacion.json` | Financiación, salidas a bolsa y riesgo regulatorio. |
| `gpu_alquiler.csv` | Precio de la H100 (SDH100RT) y otras GPU si no hay clave de Silicon Data. |

Regla de oro: un dato con `verificado: false` se muestra con la insignia «Dato del vídeo, sin verificar»; un dato ausente, como «Sin dato». Nunca se interpola ni se inventa un valor. Las URLs de las semillas apuntan al segundo exacto del vídeo.

`data/auto/` lo escriben los jobs J1 y J2 mediante PR; `data/seed/` es estático (citas del vídeo, puntocom, componentes del SOXX).

## Despliegue en Vercel

1. El código está en el repositorio [`aitordelapuente/burbuja-ia`](https://github.com/aitordelapuente/burbuja-ia).
2. En Vercel, **Add New → Project**, importa el repositorio (framework Next.js, sin cambios de build).
3. Variables de entorno: `SEC_USER_AGENT` (con un correo real), `CRON_SECRET`, `HEALTH_TOKEN` (genera ambos con `openssl rand -hex 32`) y, opcionalmente, `SILICONDATA_API_KEY`, `FRED_API_KEY`, `NEXT_PUBLIC_SITE_URL`.
4. Despliega. `vercel.json` configura Vercel Cron contra `/api/cron/refresh`. **Si tu plan es Hobby** (un solo cron diario), deja solo la entrada `30 21 * * 1-5`: la ISR de 900 s cubre el resto.

Alternativa por CLI: `pnpm dlx vercel@latest link` y `pnpm dlx vercel@latest deploy --prod`.

## Operación y mantenimiento automático

Ver [`docs/OPERACION.md`](docs/OPERACION.md).

## Limitaciones conocidas

Ver el módulo M12 del panel y la sección 16 de la especificación. En resumen: la API de Silicon Data es de pago; Yahoo es una API no oficial (si bloquea desde Vercel se sirve el último dato con aviso); OpenAI es privada y sus eventos dependen de comunicados y medios; algunas cifras del vídeo son inaudibles y se marcan como dudosas.

## Checklist de aceptación (sección 14)

- [x] Los 42 indicadores (más I24b) y las 6 condiciones están renderizados.
- [x] Cada cifra lleva su fuente y su fecha (insignia de fuente, «automática/manual», «verificado» o «Dato del vídeo, sin verificar»).
- [x] Ningún dato es inventado: los datos ausentes se muestran como «Sin dato»; los fixtures sintéticos solo se usan con `MOCK_DATA=1` y la interfaz lo indica.
- [x] `pnpm build`, `pnpm test` (34 unitarios), `pnpm test:maintenance` (58) y `pnpm e2e` (23, con axe WCAG 2.2 AA) en verde.
- [x] El cron está configurado (`vercel.json`).
- [ ] Despliegue en Vercel: pendiente de credenciales. El build local funciona; ver «Despliegue en Vercel».

### Mantenimiento

- [x] Workflows `ci.yml`, `collect.yml` (J1), `research.yml` (J2), `monitor.yml` (J3), `contracts.yml` (J4) y `deploy.yml` validados con actionlint 1.7.7.
- [x] `renovate.json` válido (`renovate-config-validator`).
- [x] Test `research/nvidia-regex` sobre el recorte de `q3fy27cfocommentary.htm` (130.000 M$ con su cita). La ejecución manual de `research.yml` con `tarea=nvidia` queda pendiente de tener el repositorio en GitHub.
- [x] `monitor`: issue `[monitor]` deduplicado y cierre tras dos ejecuciones verdes, comprobado con la API de GitHub simulada (msw).
- [x] `/api/health?detalle=1` sin token → 401; con token → tabla de la sección 18.1 (`filas`).

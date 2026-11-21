# Operación del mantenimiento automático

Este documento explica qué hace cada job de GitHub Actions, cuándo se ejecuta, cómo pausarlo, qué secretos necesita y qué sigue necesitando a una persona. Desarrolla la sección 18 de `ESPECIFICACION.md` con el **ajuste de seguridad** que decidió el equipo.

## Política de seguridad (resumen)

1. **Ningún bot aprueba PR ni hace merge de cambios que requieren revisión.** Los PR con la etiqueta `revision-humana` solo los mergea una persona.
2. **c5 y c6 (quiebra o adquisición) siempre quedan en `revision-humana`.** Las reglas A (fuente primaria) y B (consenso de ≥ 3 medios en 72 h) solo **etiquetan** (`revision-humana` + `suceso`) y **comentan** en el cuerpo del PR qué regla se cumple. `C56_AUTOMERGE_TIMEOUT_H` está fijado a 0: si la variable tiene otro valor, J2 la ignora y lo dice en el PR.
3. **No hay agente de autorreparación.** J4 solo abre issues `[contrato]` con el diff. `AUTOFIX_AGENT` se ignora.
4. **El único automerge permitido** es el auto-merge nativo de GitHub (`gh pr merge --auto --squash`, que espera a que el check `ci` pase):
   - en PR de datos de bajo riesgo que cumplan **todas** las condiciones de la 18.3.5: solo altas, citas verificadas en la página, dentro de rango y de la variación máxima, nada de c5/c6, ninguna gravedad 3 y ningún laboratorio en `tension`/`evento`;
   - en las actualizaciones *patch* y *minor* (paquetes estables, tras 3 días) de Renovate.
5. **No se cierran PR automáticamente.** Los `revision-humana` de más de 7 días solo se avisan en J3.

El script `.github/scripts/automerge.sh` aplica el punto 4: si el PR tiene o recibe `revision-humana`, desactiva cualquier auto-merge anterior y quita `automerge` (una rama compartida, como `bot/collect`, puede recibir datos nuevos después de activarlo).

## Jobs

| Job | Workflow | Cuándo | Qué hace | Resultado |
|---|---|---|---|---|
| CI | `ci.yml` | `pull_request`, `push` a `main` y `workflow_dispatch` | `install --frozen-lockfile`, `lint`, `typecheck`, `test` (unitarios), `test:maintenance`, `test:manual-data`, `MOCK_DATA=1 build` y `MOCK_DATA=1 e2e` (Chromium y axe, con caché de navegadores) | Check obligatorio `ci` |
| J1 · Recolector | `collect.yml` | `15 */6 * * *` | `scripts/collect/gpu-abierto.ts`: RunPod, Vast.ai, Azure y AWS → IAA_neo e IAA_hs de H100 y B200; reemplaza las filas del día en `data/auto/gpu_alquiler_abierto.csv`; con `SITE_URL`, añade los cruces nuevos de `/api/snapshot` a `data/auto/sucesos.csv` | PR en `bot/collect`: `automerge` si solo cambian filas del día, en 0,3–40 $/h y con variación ≤ 25 %; si no, `revision-humana` |
| J2 · Investigador | `research.yml` | Diario `30 6 * * *` (gpu_oficial, nvidia, eventos, frentes_nvidia, regulacion); lunes `0 7 * * 1` (financiacion_labs, opv, polymarket); `workflow_dispatch` con `tarea`; `repository_dispatch` `research-urgente` (gpu_oficial y eventos) | `scripts/research/run.ts --tareas=…`: pasos deterministas (EDGAR, Federal Register, página de Silicon Data) → LLM si hay clave → verificación determinista (URL viva, cita literal, cifra en la cita, fechas, duplicados, rango) → reglas A/B → solo altas en `data/manual/*` o `data/auto/*` | Un PR por tarea en `bot/research-{fecha}-{tarea}`, con `pr-body.md` (tabla de datos, citas, descartes y coste) |
| J3 · Monitor | `monitor.yml` | `0 */3 * * *`, `deployment_status` correcto y `workflow_dispatch` | `scripts/monitor/run.ts`: `/api/health` (200 en < 10 s), `/api/health?detalle=1` (ningún `sin_dato`), portada con el título, último J1 y J2 correctos en 26 h, Polymarket (reglamento y mercado abierto), PR `revision-humana` > 7 días, majors de Renovate > 90 días, modo reducido de J2 y aviso XBRL/J2 > 1 %. Urgencias: suceso nuevo de c1-c3 o proxy de c4 ≤ 1,20 $/h dos días → `research-urgente` + issue `[suceso]` | Issues `[monitor] {comprobación}: {resumen}` deduplicados por prefijo; se cierran tras 2 ejecuciones seguidas en verde. Webhook y correo solo al abrir y al cerrar |
| J4 · Contratos | `contracts.yml` | Domingo `0 5 * * 0` y `workflow_dispatch` | `pnpm vitest run --config vitest.contract.config.mts` en vivo contra Yahoo, Polymarket (Gamma y CLOB), SEC (companyconcept y submissions), FRED, RunPod, Vast, Azure, AWS, Federal Register y Silicon Data (con clave); valida con el zod del conector y compara el esquema observado con `tests/contract/snapshots/` | Issue `[contrato] {fuente} ha cambiado de formato` con el diff y la respuesta recortada (≤ 5 KB). Si solo hay campos nuevos, PR `revision-humana` en `bot/contratos` |
| Despliegue | `deploy.yml` | `push` a `main` y `workflow_dispatch`, **solo** con la variable `DEPLOY_CON_ACTIONS=true` | `vercel pull`, `vercel build --prod` y `vercel deploy --prebuilt --prod` | Producción en Vercel (si no se usa la integración Git) |
| Renovate | GitHub App + `renovate.json` | Lunes antes de las 6:00 (Madrid) | Patch y minor estables con auto-merge nativo; pin, digest, majors, 0.x y mantenimiento del lockfile con `revision-humana` | PR de dependencias |

Tras un despliegue a producción, J3 repite las comprobaciones 1 y 3; si fallan dos veces seguidas en 15 min, ejecuta `vercel rollback` (con `VERCEL_TOKEN`) y abre un issue; sin token, solo abre el issue.

### Ejecutar a mano

```bash
gh workflow run research.yml -f tarea=nvidia      # o diarias, semanales, eventos, polymarket…
gh workflow run collect.yml
gh workflow run monitor.yml
gh workflow run contracts.yml
```

En local (sin crear PR; la salida va al directorio temporal del sistema o a `--salida`):

```bash
pnpm tsx scripts/collect/gpu-abierto.ts --salida=/tmp/bot
pnpm tsx scripts/research/run.ts --tareas=nvidia --salida=/tmp/bot
pnpm tsx scripts/research/polymarket-descubrir.ts --salida=/tmp/bot
SITE_URL=https://… HEALTH_TOKEN=… pnpm tsx scripts/monitor/run.ts
pnpm vitest run --config vitest.contract.config.mts && pnpm tsx scripts/contract/report.ts
pnpm tsx scripts/contract/snapshots.ts            # regenera los snapshots desde los fixtures
pnpm tsx scripts/contract/snapshots.ts --vivo     # o desde las respuestas reales (necesita red)
GITHUB_TOKEN=… GITHUB_REPOSITORY=propietario/panel-pinchazo-ia pnpm tsx scripts/setup/labels.ts
```

### Pausar y reanudar

```bash
gh workflow disable research.yml   # pausa J2 (igual con collect.yml, monitor.yml, contracts.yml)
gh workflow enable research.yml
```

Para pausar Renovate, desactiva la GitHub App en el repositorio o añade `"enabled": false` a `renovate.json`. Un PR concreto se frena quitando `automerge` o poniendo `revision-humana`.

## Investigador (J2): proveedor del LLM

El cliente es genérico y compatible con OpenAI `chat/completions`:

| Variable | Por defecto | Uso |
|---|---|---|
| `RESEARCH_API_URL` | `https://api.perplexity.ai/chat/completions` | Endpoint del proveedor |
| `RESEARCH_API_KEY` (alias `PERPLEXITY_API_KEY`) | vacío | Sin clave, los pasos LLM se omiten (modo reducido) y J3 lo avisa |
| `RESEARCH_MODEL` | `sonar-pro` | Modelo |
| `RESEARCH_WEB_SEARCH` | `auto` (sí con Perplexity, no con otros) | Si el proveedor no busca en la web, el LLM solo extrae de los documentos que le pasa el código (8-K, Federal Register, artículos de GDELT, página de Silicon Data) y solo puede citar sus URL |
| `RESEARCH_MAX_USD_DIA` | `1.00` | Tope de gasto diario estimado; al superarlo se detiene el LLM y se abre un issue |
| `RESEARCH_USD_MTOK_ENTRADA`, `RESEARCH_USD_MTOK_SALIDA`, `RESEARCH_USD_PETICION` | 3, 15 y 0,01 | Precios para estimar el coste; ajústalos a tu proveedor |

Con un proveedor sin búsqueda web, la tarea `opv` y la parte de OpenAI de `financiacion_labs` no producen datos (no hay fuente estructurada que pasarle).

## Secretos y variables

| Nombre | Tipo | Jobs | Obligatorio | Uso |
|---|---|---|---|---|
| `GITHUB_TOKEN` | automático | todos | — | Issues, etiquetas, PR y `repository_dispatch` (permisos mínimos declarados por job) |
| `BOT_TOKEN` | secreto | J1, J2 | Recomendado | Token de una GitHub App o PAT *fine-grained* (contents y pull-requests de este repo). Los PR creados con `GITHUB_TOKEN` no disparan `pull_request`; sin `BOT_TOKEN`, J1/J2 lanzan `ci.yml` con `workflow_dispatch` sobre la rama del PR para que el check `ci` exista |
| `RESEARCH_API_KEY` o `PERPLEXITY_API_KEY` | secreto | J2, J3 | Para el LLM | Clave del proveedor |
| `RESEARCH_API_URL`, `RESEARCH_MODEL`, `RESEARCH_WEB_SEARCH`, `RESEARCH_MAX_USD_DIA` | variables | J2 | No | Ver la tabla anterior |
| `SEC_USER_AGENT` | variable | J2, J4 | Sí | `Nombre contacto@dominio` para EDGAR |
| `HTTP_USER_AGENT` | variable | J1, J2, J3, J4 | No | User-Agent de navegador |
| `SILICONDATA_API_KEY` | secreto | J2, J4 | No | Con clave, la app lee la API y J2 no lee la página pública |
| `SITE_URL` | variable | J1, J3 | Sí | URL de producción |
| `HEALTH_TOKEN` | secreto | J3 | Sí | El mismo que en la app (`/api/health?detalle=1`) |
| `ALERT_WEBHOOK_URL` | secreto | J3 | No | `POST {texto, nivel, issue_url}` al abrir y cerrar |
| `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM` | secreto y variables | J3 | No | Correo `[Panel pinchazo IA] {título}` al abrir y cerrar |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secretos | J3, deploy | No | Rollback tras un despliegue fallido y `deploy.yml` |
| `DEPLOY_CON_ACTIONS` | variable | deploy | No | `true` para desplegar desde Actions en vez de la integración Git |
| `AUTOFIX_AGENT`, `C56_AUTOMERGE_TIMEOUT_H` | — | — | — | **Sin efecto** por la política de seguridad |

## Configuración del repositorio (una vez)

1. `pnpm tsx scripts/setup/labels.ts` crea `automerge`, `revision-humana`, `monitor`, `contrato`, `autofix` y `suceso`.
2. Settings → General → *Allow auto-merge* activado.
3. Protección de `main`: check obligatorio `ci`, PR obligatorio y *Require review from Code Owners*. Sustituye `@PROPIETARIO` en `.github/CODEOWNERS`.
4. Settings → Actions → *Workflow permissions*: lectura por defecto (cada workflow declara sus permisos) y *Allow GitHub Actions to create and approve pull requests* activado solo para **crear** PR (ningún job aprueba).
5. Instala la GitHub App de Renovate.

## Qué sigue necesitando a una persona

| Caso | Si nadie actúa |
|---|---|
| PR `revision-humana` de datos fuera de rango, con citas solo en *snippet*, de gravedad 3 o que modifican datos | Se queda abierto; el panel sigue con el dato anterior (`stale` cuando toque). J3 avisa a los 7 días; **no se cierra solo** |
| c5/c6 (regla A, regla B o candidatos en investigación) | Se queda en revisión: c5/c6 **no se activan** hasta que una persona mergea. Los candidatos sin regla van a `data/auto/candidatos_c56.json`, también en revisión |
| Contrato roto (J4) | El dato afectado queda `stale` y el issue `[contrato]` abierto hasta que una persona arregle el conector |
| Snapshots de esquema con campos nuevos | PR `revision-humana`; no rompe nada si no se mergea |
| Versiones mayores, pin/digest, paquetes 0.x y mantenimiento del lockfile | Siguen en la versión anterior; J3 avisa a los 90 días |
| Rollback tras un despliegue roto sin `VERCEL_TOKEN` | Issue abierto; rollback manual desde Vercel |
| Altas de cuentas y claves (Vercel, GitHub App, proveedor del LLM, Silicon Data, Resend, webhook) | Una sola vez, al instalar |

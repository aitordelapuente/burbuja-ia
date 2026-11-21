#!/usr/bin/env bash
# Activa el auto-merge NATIVO de GitHub (se mergea solo cuando el check «ci» pasa) únicamente en PR de bajo riesgo.
# Política del equipo: ningún bot aprueba ni mergea un PR en revisión. Si el PR tiene (o recibe) `revision-humana`,
# se desactiva cualquier auto-merge previo y se quita `automerge`, porque la rama puede haber recibido datos nuevos.
# Entorno: GH_TOKEN, PR, ETIQUETAS (separadas por comas), RAMA, SIN_BOT_TOKEN ("true" si no hay BOT_TOKEN).
set -euo pipefail

actuales="$(gh pr view "$PR" --json labels --jq '[.labels[].name] | join(",")')"

if [[ ",${ETIQUETAS}," == *",revision-humana,"* || ",${actuales}," == *",revision-humana,"* ]]; then
  gh pr merge "$PR" --disable-auto >/dev/null 2>&1 || true
  gh pr edit "$PR" --remove-label automerge >/dev/null 2>&1 || true
  gh pr edit "$PR" --add-label revision-humana
  echo "PR #$PR en revisión humana: sin auto-merge."
  exit 0
fi

if [[ ",${ETIQUETAS}," == *",automerge,"* ]]; then
  gh pr merge "$PR" --auto --squash
  echo "PR #$PR: auto-merge nativo activado (se mergea cuando CI pase)."
  # Los PR creados con GITHUB_TOKEN no disparan pull_request: se lanza CI a mano sobre la rama.
  if [[ "${SIN_BOT_TOKEN:-false}" == "true" ]]; then
    gh workflow run ci.yml --ref "$RAMA"
    echo "CI lanzado con workflow_dispatch sobre $RAMA."
  fi
fi

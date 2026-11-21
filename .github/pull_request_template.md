<!-- Plantilla de PR del Panel de control del pinchazo de la IA. Los PR de los bots (J1, J2, J4) traen su propio cuerpo. -->

## Qué cambia

-

## Tipo

- [ ] Datos (`data/manual`, `data/auto`): cada cifra lleva `fuente_url` y cita literal verificada
- [ ] Código de la aplicación
- [ ] Mantenimiento (workflows, `scripts/`, Renovate)

## Comprobaciones

- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde
- [ ] `pnpm test:manual-data` en verde si toca datos
- [ ] Ningún dato inventado, interpolado ni extrapolado
- [ ] Si toca c5/c6 (`eventos.json`, `candidatos_c56.json`): regla A o B indicada y revisada por una persona

> Política del equipo: ningún bot aprueba ni mergea PR con `revision-humana`. Solo los PR `automerge` de bajo riesgo
> (y Renovate patch/minor) usan el auto-merge nativo de GitHub cuando el check `ci` pasa.

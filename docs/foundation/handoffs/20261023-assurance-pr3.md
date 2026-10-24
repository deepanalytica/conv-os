# Handoff — Assurance Gate v0.1 (Conv OS)

**Misión:** Convertir reglas PRAXIOS/Meta-Harness de documentos propuestos en verificaciones ejecutables conservadoras sin integrar runtimes ni modificar cuentas.

**Entrega:** branch `feat/assurance-gates`, PR [#3](https://github.com/deepanalytica/conv-os/pull/3), base `docs/praxios-meta-harness-foundation` (PR #2). `main` permanece sin cambios.

## Alcance entregado
- Policy evaluator puro en `src/assurance.js` para pasos con IDs, requisitos, riesgo, budget, policy digest y capability.
- `scripts/assurance-check.mjs`: 8 indicadores anti-deriva (inspección estática) y evaluación de plan local.
- `tests/assurance.test.js`: positivos y negativos de capacidad, digest, IDs, requisitos PRD, pruebas de regresión y schemas.
- Contratos JSON Schema en `docs/foundation/schemas/` y ejemplo bajo `templates/`.
- `npm run check` ejecuta también `npm run assurance:check` en GitHub Actions.
- [Documento de alcance y limitaciones](../14-ASSURANCE-ENGINE.md).

## Evidencia observada
- CI exitoso en `feat/assurance-gates` para código base de motor y runbook: [run #40051314859](https://github.com/deepanalytica/conv-os/actions/runs/40051314859).
- Revisión final del commit más reciente de contratos puede generar nueva corrida de CI; el enlace concreto debe corroborarse antes de actualizar esta evidencia.
- No hubo ejecución local en Windows, acceso a PRAXIOS runtime, Meta OAuth, mensaje real ni prueba con datos personales.

## Riesgos y autorizaciones
- Resultados `ALLOW` del evaluator **no tienen conexión con ejecutores de herramientas**. Solo las capacidades de lectura/prueba local son elegibles.
- Escrituras requieren REVIEW; pagos, anuncios, DMs reales, migración de número, secretos y producción permanecen DENY.
- Un agente controla el payload: `policy_digest` detecta deriva de versión, **no** es una firma digital. Faltan aprobación externa autenticada, auditoría y evidencia firmada.
- `docs/foundation/status.json` mantiene documentos PROPOSED y gate de release BLOCKED.

## Próxima acción (única)
Verificar pruebas en el head exacto del PR #3, revisar el diff y, tras aprobación humana del PR, obtener acceso a la copia local Windows para E2E y BitLocker sin introducir PII.

**Estado de cierre:** CODE_COMPLETE + CI parcial confirmada; no RELEASED, no Windows VALIDATED, no runtime PRAXIOS conectado.

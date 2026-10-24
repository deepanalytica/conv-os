# Máquinas de estados — producto, agentes, documentación y evidencia
**Estado:** PROPOSED · La transición válida es una función determinista, con auditoría.

## A. Opportunity (CRM) — código actual
```text
new ─→ qualified ─→ proposal ─→ negotiation ─→ won
 │         │             │               │
 └─────────┴─────────────┴───────────────┴──→ lost
proposal ─→ won (permitido)
```
`won` = intención/acuerdo comercial registrado; **no** pago verificado.
Cada transición registra actor autorizado, estado anterior/nuevo, fecha, motivo y versión del dato. Los estados `won` y `lost` son terminales en MVP; reabrir requiere comando futuro y justificación humana.

## B. Order — máquina existente en src/domain.js
`draft → awaiting_payment → paid → in_progress → ready → out_for_delivery → completed` con salidas permitidas a `cancelled` según matriz real del código. `paid` requiere confirmación comprobable de pasarela. No inferir `paid` por captura, chat ni estado CRM.
En etapa MVP de laboratorio, `paid` es **pago simulado** y visualmente debe marcarse como tal.

## C. ChannelConnection (planeado)
`UNCONFIGURED → AUTH_PENDING → SCOPES_GRANTED → WEBHOOK_TESTED → CONNECTED`.
Transiciones de emergencia: `REAUTH_REQUIRED`, `PAUSED`, `REVOKED`, `FAILED`, `DISCONNECTED`.
Nunca `CONNECTED` por mera existencia de App ID o token: exige handshake oficial, alcance autorizado, webhook autenticado de prueba y acceso de lectura de estado verificado. Reconexión manual para WhatsApp coexistente; nunca migración automática del número actual.

## D. Message/Consent (planeado)
`RECEIVED → VALIDATED → ROUTED → STORED` o `REJECTED/QUARANTINED`.
Outbound: `DRAFT → POLICY_CHECKED → HUMAN_APPROVED → QUEUED → SUBMITTED → DELIVERED/FAILED/UNKNOWN`.
Un ACK de API no equivale a entrega. Ventanas de mensajería, plantillas, exclusión opt-out, canal, propósito y derechos deben verificarse en el momento de envío.
Consentimiento: `UNKNOWN → OPTED_IN → OPTED_OUT`; `OPTED_OUT` bloquea comunicaciones promocionales salvo nueva autorización válida y registrada. No interpretar conversación iniciada por cliente como consentimiento indefinido para marketing.

## E. Task y proceso PRAXIOS (planeado como contrato)
`READY → RUNNING → WAITING_HUMAN / BLOCKED / RECOVERABLE / FAILED / COMPLETED`.
- COMPLETED solo con evidencia del resultado y gate aprobado.
- BLOCKED por guardas, permisos o dependencia pendiente; no reintentar indefinidamente.
- RECOVERABLE con plan de reintento, presupuestos y límite.
- WAITING_HUMAN ante autorización sensible o incertidumbre crítica.
Cada step: `mission_id, step_id, revision, dependencies, capability, risk, deadline, budget, policy_digest, idempotency_key`.

## F. Ciclo documental
DRAFT → PROPOSED → ACCEPTED por humano responsable → SUPERSEDED (con ADR) o REJECTED.
Una especificación no aceptada es borrador útil; no es autorización de ejecución. Tests que pasan no elevan automáticamente una decisión documental a ACCEPTED.

## G. Evidencia y afirmaciones
`CONJECTURE → DESIGNED → IMPLEMENTED → VERIFIED_BY_TEST → OBSERVED_IN_TARGET → HUMAN_APPROVED`.
No es una escalera automática: el verificador escribe cuál proposición/versión/procedimiento pudo validar. Observado en una máquina de CI ≠ observado en Windows real ≠ aprobado para producción.

## Propiedades invariantes
- Una transición sin versión de estado esperada se rechaza o se trata mediante control de concurrencia.
- El mismo `idempotency_key` con mismo contenido devuelve resultado previo; diferente contenido es conflicto.
- Ningún evento ambiguo decide por sí solo si hubo pago, consentimiento, identidad o entrega.
- Registro auditable de toda transición con fuente y actor.
- Bloqueo por violación de seguridad no puede elevarse por «confianza» de un agente.

# Ontología, contratos y trazabilidad de datos
**Estado:** PROPOSED · Implementación incremental: no introducir todas las tablas sin caso aprobado.

## Entidades canónicas objetivo
| Entidad | Campos mínimos | Restricciones |
|---|---|---|
| Organization | tenant_id, name, segment, status | Separación total de acceso y propiedad |
| Membership | user_id, tenant_id, role, status | Futuro: RBAC; owner local actual no multiusuario |
| ChannelAccount | id, tenant_id, provider, provider_account_id, connection_state | UNIQUE(provider,provider_account_id), secretos fuera de DB en claro |
| Contact | id,tenant_id,name,created_at | PII con retención definida |
| ContactIdentity | id, contact_id, tenant_id, channel_account_id, external_subject_id, verification_level | Prohibido mezclar por nombres/textos similares |
| ConsentReceipt | id, tenant_id, identity_id, purpose, legal_basis, state, captured_at, source | Opt-out verificable, no consentimiento implícito |
| Conversation | id,tenant_id,channel_account_id,external_thread_id,state | UNIQUE por proveedor/cuenta/hilo |
| Message | id,conversation_id,provider_message_id,direction,status,received_at | UNIQUE id externo por cuenta y dirección |
| Opportunity | id, tenant_id, contact_id, stage, source, amount_cents | Estimación comercial, no ingreso |
| Followup | id,tenant_id,opportunity_id,due_at,status | No implica envío |
| Quote | id,tenant_id,version,items,expires_at,total_cents | Precio servidor, versiones inmutables |
| Order | id,tenant_id,items,status,total_cents | Flujo existente determinista |
| PaymentEvidence | id,order_id,provider,event_id,verified_at,status | Solo proveedor autenticado, replay protegido |
| MarketingTouch | id,tenant_id,contact_id,channel,campaign,occurred_at,consent | Procedencia y atribución limitadas |
| CostEntry | id,tenant_id,type,amount_cents,period,source | Publicidad, materiales, comisiones, logística |
| AuditEvent | id,tenant_id,actor,action,target,at,correlation_id,hash | No registrar secretos ni cuerpos completos |
| EvidenceReceipt | id,claim_id,kind,artifact_ref,sha256,observed_at | Distinguir referencia, integridad y verdad |
| ActionReceipt | id,step_id,idempotency_key,provider_result,observed_at | Efecto medible, no narración |

## Contratos de integración (versión propuesta)
```json
{
  "schema_version": "0.3-proposed",
  "provider": "whatsapp|instagram|facebook",
  "channel_account_id": "internal-uuid",
  "provider_event_id": "provider-string",
  "tenant_id": "derived-server-side",
  "received_at": "ISO-8601",
  "payload_class": "message|status|account",
  "signature_status": "VERIFIED",
  "consent_state": "UNKNOWN|OPTED_IN|OPTED_OUT",
  "correlation_id": "uuid",
  "idempotency_key": "sha256(provider/account/event)"
}
```
No confiar en `tenant_id` ni en nombres enviados por un webhook: resolver exclusivamente desde `ChannelAccount` autorizado. Nunca registrar token OAuth ni contenido sin política de retención.

## Contrato de comando crítico
```json
{
  "command_id": "uuid",
  "tenant_id": "authorized-context",
  "actor_id": "human-or-service",
  "action": "message.send|quote.approve|payment.verify",
  "resource_id": "uuid",
  "expected_version": 7,
  "policy_version": "vN",
  "idempotency_key": "uuid",
  "human_approval_id": "uuid-or-null",
  "evidence_refs": [],
  "created_at": "ISO-8601"
}
```
La presencia de `human_approval_id` no equivale a aprobación: debe comprobarse firma/sesión, autorización vigente, expiración y objetivo exacto.

## Contratos de resultados de agentes
- `StepProposal`: acción propuesta, entradas/procedencia, riesgos, dependencias, costo previsto, pruebas objetivo.
- `GateDecision`: ALLOW / DENY / REVIEW, razón, versión de política, evidencia y responsable.
- `VerificationRecord`: propiedad comprobada, herramienta, comando, hash del artefacto, salida, limitación y timestamp.
- `ActionReceipt`: efecto realmente ejecutado y comprobado; `NO_EFFECT` también es resultado.
- `Handoff`: estado verificado, archivos/cambios, fallos, tareas abiertas y próxima prueba.

## Políticas de compatibilidad
Versión mayor cambia semántica; versión menor agrega campos opcionales; nunca reinterpretar `won`, `paid` ni `delivered` silenciosamente. Toda migración de datos lleva rollback documentado, prueba de integridad y copia previa.

## Referencias a código
CRM actual: `src/crm.js`; followups: `src/followups.js`; pagos/operaciones: `src/domain.js`; webhook de laboratorio: `src/server.js`. El contrato de eventos canónico, outbox y OAuth multiempresa están **planeados**, no implementados.

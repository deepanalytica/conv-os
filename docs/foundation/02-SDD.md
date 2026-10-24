# SDD v0.3 — Arquitectura y fronteras de confianza
**Estado:** PROPOSED · **Principio:** monolito modular local-first; ninguna reescritura sin ADR y evidencia.

## Estado técnico observado de origen
`src/server.js` en Node.js 22.13+ usa `node:sqlite`; `src/domain.js` gobierna estados de pedido; `src/crm.js` y `src/followups.js` gestionan CRM local; `public/` ofrece UI y demo estática; sesiones locales/CSRF en `src/security.js`; la rama `feat/acquisition-os` tiene CI, respaldos y arranque Windows. **No hay conector real habilitado de Meta, pasarela de pagos ni gateway en producción.**

## Diagrama lógico objetivo
```text
Meta (Instagram / Messenger / WhatsApp)
      │ HTTPS webhook [no conectado]
      ▼
Gateway público mínimo, independiente [PLANNED]
  firma HMAC + ID autorizado + límites + ACK
      │ cola cifrada, TTL y deduplicación [PLANNED]
      ▼
Pull saliente autenticado desde PC [PLANNED]
      │ sin exponer dashboard ni SQLite
      ▼
Conv OS localhost:4173 [EXPERIMENTAL]
   ├─ Auth/owner + CSRF
   ├─ Organizaciones / Channel registry
   ├─ CRM / Followups / Inbox
   ├─ Orders / Catalog / Payment verification (future)
   ├─ Attribution / Costs / Metrics (future)
   ├─ Event/Audit ledger + Outbox (future)
   ├─ PRAXIOS adapter → ejecución controlada (future)
   └─ Meta-Harness adapter → gates y evidencias (future)
      │
      ▼
SQLite y respaldos (disco Windows)
```

## Modularidad y dependencias
- **Domain** puro y testeable: estados, reglas comerciales, estimaciones, validación de montos.
- **Application**: comandos con autorizaciones, idempotencia, auditoría y políticas de consentimiento.
- **Persistence**: repositorios SQL; cambios de esquema mediante migraciones versionadas. No insertar SQL en vistas.
- **Integration adapters**: Meta inbound/outbound, proveedores de pago, autenticación externa y gateway; interfaces estrechas.
- **Presentation**: UI accesible con estados explícitos; no recalcular precios ni atribución desde el browser.
- **Assurance adapter**: recibe `StepProposal`, `EvidenceReceipt`, `GateDecision`; no acepta una narración LLM como comprobante.

## Fronteras
B1. Dispositivo local: el propietario controla sesión, volúmenes, respaldos, actualizaciones y antivirus.
B2. Gateway público: **solo** recepción de webhooks verificados; sin endpoints de lectura de conversaciones ni acceso a panel.
B3. Canal oficial: registro OAuth, scopes mínimos, ID real de cuenta, revocación, ventanas y plantillas.
B4. LLM: contenido no confiable, puede sugerir clasificación/respuesta; sin acceso autónomo a claves ni aprobación de pagos.
B5. Organización: `tenant_id` derivado de conexión autenticada, nunca de un número o texto enviado por el cliente.

## Flujo inbound proyectado
1. Meta firma evento → gateway verifica bytes originales, timestamp si proveedor ofrece, tamaño y canal.
2. Reconocer cuenta aprobada por identificador oficial; sin cuenta conocida → cuarentena/metadatos mínimos.
3. Dedupe por `provider + channel_account_id + provider_event_id`, transacción y ACK.
4. Cifrar y encolar con TTL acotado; el PC consume en modalidad pull con credencial propia y cursor.
5. Confirmar persistencia local antes de ACK definitivo hacia cola; reintentos seguros.
6. Resolución de identidad/consentimiento; crear conversación o adjuntar sin fusionar personas inseguramente.
7. Regla de negocio propone task/borrador; envío explícito solo tras políticas Meta y autorización.
8. Registrar `ActionReceipt` y evidencia de entrega si proveedor la suministra.

## Persistencia y rendimiento
SQLite WAL en PC para propietario único: razonable hasta que métricas indiquen cuello de botella; respaldar consistentemente. No migrar a D1 o PostgreSQL por impulso. Si el negocio exige multiusuario/sincronización constante, documentar cambio en ADR con pruebas de aislamiento y costos.

## Recuperación
Si PC apagado: tareas locales no funcionan; gateway futuro debe absorber eventos temporalmente con TTL y avisar límites sin asegurar entrega perpetua. Si falla sincronización: reintento con idempotencia. Si revocan permisos: pausar conexión y mostrar estado `REAUTH_REQUIRED`. Ningún sistema puede garantizar riesgo cero.

## Decisiones por registrar
- Retención máxima por tipo de mensaje/adjunto; confirmar marco legal.
- Gateway Cloudflare Workers + Queue u opción equivalente, costo real y límites.
- Custodia de OAuth y cifrado de datos en reposo (BitLocker más gestión de secretos).
- Estrategia de acceso multioperador, cuando haya necesidad confirmada.

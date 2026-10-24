# CONV OS — UI v1 y conexión segura Meta
**Estado: CODE_COMPLETE para UI, gateway firmado y consumidor de metadatos; NO CONNECTED para cuentas reales.**

## Objetivo
Mantener el panel Windows de WAL y Visual Art AI PRIVADO en `127.0.0.1:4173`, con un gateway público mínimo separado para verificar eventos de Instagram, Messenger y WhatsApp, sin registrar contenido de clientes hasta completar autorización, seguridad y protección de datos.

## Dirección visual implementada
- `public/workspace-v1.css`: jerarquía tipográfica, navegación, densidad de información, superficies grafito, estados explícitos, responsive. Tokens visuales por marca WAL (ámbar) y Visual Art AI (azul).
- `public/integrations-ui.js`: conexiones reales siempre `NOT_CONNECTED` mientras falte autorización verificada, diagnóstico y checklist por canal.
- `public/index.html`: CSS y naming Acquisition OS; la carga de fuentes externas fue eliminada para no depender de Google Fonts ni hacer peticiones de terceros desde el navegador privado.
- `public/app.js`: empresa visible, navegación clara, banner de laboratorio y CTA contextual.
- `src/integrations.js`: endpoint local autenticado `GET /api/integrations/status`; muestra solo booleanos de configuración, no secretos, y recuento de metadatos locales por empresa. No hay endpoints que conviertan un canal en CONNECTED por decisión manual.

## Arquitectura

```text
[Meta: Instagram / Messenger / WhatsApp]
     |
     v webhook HTTPS público, X-Hub-Signature-256
[Cloudflare Worker /webhooks/meta]
     |  HMAC verificado + payload acotado
     |  D1: account id -> tenant id únicamente si VERIFIED externamente
     |  NO recopilar texto, remitente ni adjuntos
     v
[Cloudflare Queue]  -- PULL autenticado desde Windows -->
[Script local, metadatos únicamente]
     | solo esquema v1, 0 PII, idempotencia por event_hash
     v
[SQLite local / channel_event_receipts]
     |
     v
[Dashboard localhost; NO se expone por túnel]
```

Se ha programado este camino, pero **no hay cuenta OAuth, recurso Cloudflare o token Meta conectado realmente**.

## Requisitos por plataforma

### Instagram profesional
- Cuenta profesional y permisos de la modalidad **Instagram Login**, especialmente `instagram_business_basic` y `instagram_business_manage_messages`.
- Autorizar la aplicación Meta correspondiente y su redirección HTTPS según la configuración vigente de Meta.
- Probar una consulta de desarrollo, obtener prueba de que la cuenta pertenece al negocio y registrar vínculo tenant-ID solo desde un proceso de onboarding autenticado y auditado.
- Revisar App Review/Advanced Access según uso y permisos. Instagram Login no cubre todas las funciones publicitarias.

Referencia: https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login

### Facebook Messenger
- Página oficial vinculada al negocio y permisos de Pages/Messenger según modalidad de Meta: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`.
- App Review, autorización de página y suscripción al webhook correspondientes.
- Verificar el ID de página, tenant y alcance antes de declarar VERIFIED.

Referencia: https://developers.facebook.com/docs/messenger-platform/

### WhatsApp Business
- **No migrar el número actual por el registro convencional**. Evaluar antes Embedded Signup / WhatsApp Business App Coexistence, requisitos y restricciones concretas de la cuenta.
- Reservar autorización humana para el flujo de Meta (verificación/código en teléfono). No solicitar contraseñas por GitHub, ChatGPT ni el panel experimental.
- Una app Meta, WABA, número, permisos de `whatsapp_business_management` y `whatsapp_business_messaging` verificados antes de registrar una vinculación.
- Mantener mensajes salientes, pagos y publicidad deshabilitados.

Referencia oficial: https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup

## Gateway Cloudflare: no desplegado

Fuente: `edge/meta-gateway/src/index.js`.
- `GET /health`: indicador técnico, no comprueba OAuth.
- `GET /webhooks/meta`: challenge válido solo con bandera y secreto.
- `POST /webhooks/meta`: máximo 256 KiB; HMAC de bytes sin procesar obligatorio; reconoce envelope WhatsApp, Instagram y Page Messenger.
- D1 `meta_accounts`: inserción de vinculación VERIFIED bloqueada hasta verificar propiedad por OAuth/Meta; **prohibido marcar manualmente**.
- Queue `INBOUND_EVENTS`: mensajes de metadatos con `contains_customer_content:false`, ID de mensaje convertido a SHA-256 con secreto, sin texto, remitente ni archivos.
- `ENABLE_META_INBOUND=false` por defecto. No hay datos de clientes ni secrets en el repositorio.

Configuración fuente sin secretos: `edge/meta-gateway/wrangler.toml.example`; migración SQL: `edge/meta-gateway/migrations/0001_accounts.sql`.

Requiere desplegar en Cloudflare con credenciales del propietario, crear D1/Queue, configurar tres secretos en el almacén de Workers y habilitar consumidor HTTP pull siguiendo la documentación vigente.

## Pull metadatos Windows: implementación opt-in

Después de crear recursos y dar aprobación al diseño:
- Crear token Cloudflare con permisos Queues de lectura/escritura restringidos a la cuenta/cola necesaria.
- Almacenar de forma segura fuera del repositorio estas variables de entorno: `CF_ACCOUNT_ID`, `CF_QUEUE_ID`, `CF_QUEUES_TOKEN`.
- Establecer `ENABLE_META_METADATA_PULL=true` solo al ejecutar la prueba manual.
- Ejecutar una sola iteración: `npm run meta:pull:once`.
- Se leen como máximo 10 eventos por petición; solo se confirman (ACK) después de persistir en SQLite. Repetidos no duplican filas. Datos desconocidos o no conformes quedan para reintento; no se imprime información privada en logs.

Cloudflare documenta que Queue HTTP Pull requiere read + write para ACK y que mensajes JSON pueden venir en base64.

Referencia: https://developers.cloudflare.com/queues/configuration/pull-consumers/

## Gates de producción pendientes

1. Autorización oficial de las cuentas y permisos; verificación de pertenencia empresa↔cuenta.
2. Cifrado del volumen Windows (BitLocker), recuperación desde respaldo y auditoría de seguridad.
3. Definir retención y borrado de metadatos incluso pseudónimos, monitorización y deduplicación de largo plazo.
4. Envío y recepción de conversaciones completas solo después de consentimiento, App Review y política jurídica. Los textos de clientes no entran todavía al sistema.
5. Inbox real, atribución CAC, gasto publicitario y pagos verificados requieren APIs y contratos adicionales; no inferirlos.
6. E2E visual 360/768/1440, WCAG AA, teclado, validación en Windows propietario.
7. PRAXIOS Meta-Harness debe verificar evidencia externa; no basta una declaración del agente.

**Estado de release: BLOCKED.** Mantener cada avance en PR, con CI y revisión humana.

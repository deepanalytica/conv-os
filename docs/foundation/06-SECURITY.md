# Amenazas, privacidad y gates de seguridad
**Estado:** PROPOSED · Este documento es un modelo de amenazas, no una certificación.

## Activos y superficies
- **S1 PC Windows:** SQLite local, sesión Owner, archivos de respaldo, claves y documentos.
- **S2 navegador localhost:** UI del operador, cookies HttpOnly, CSRF y contenido de mensajes no confiable.
- **S3 GitHub:** código y CI; repositorio público, **sin PII ni tokens**.
- **S4 Meta (futuro):** permisos OAuth, webhooks, mensajes y metadatos del canal.
- **S5 Gateway mínimo (futuro):** entrada pública que **no** expone API interna ni contenido histórico.
- **S6 LLM/modelos externos (futuro):** datos enviados a inferencia y texto potencialmente manipulable por terceros.

## Riesgos prioritarios
| ID | Amenaza | Tratamiento y prueba | Bloqueo |
|---|---|---|---|
| SEC-01 | Exfiltración de base local | BitLocker, cuenta Windows privada, controles endpoint; verificar estado real | Antes de PII |
| SEC-02 | Port-forward accidental | Bind 127.0.0.1; rechazar Host, Origin, acceso externo; tests negativos | Antes de PII |
| SEC-03 | Cookies/cross-site y CSRF | HttpOnly, SameSite, origen exacto, token CSRF; test modificación maliciosa | Antes de PII |
| SEC-04 | Uso de credenciales Meta fuera de alcance | scopes mínimos, secretos administrados, rotación y revocación | Antes de OAuth real |
| SEC-05 | Webhook falso o replay | HMAC bytes originales, ID exacto, dedupe, size/rate limit y TTL | Antes de gateway |
| SEC-06 | Filtración por tenant | contexto autenticado servidor, queries con tenant, FK y test cruzado | Antes de PII |
| SEC-07 | Prompt injection en chat cliente | mensajes como datos no confiables; no ejecutar tool calls/políticas desde texto | Antes de IA en flujo |
| SEC-08 | Respuesta/campaña sin consentimiento | estado de opt-in/opt-out, ventanas, plantillas, human approval, kill switch | Antes de outbound |
| SEC-09 | Doble pedido/pago | transacciones, idempotency key, proveedor verificado y estados | Antes de pagos |
| SEC-10 | Robo de copia sin cifrar | backup AES-GCM, gestor de claves, custodia externa, prueba restore | Antes de PII |
| SEC-11 | Borrado incompleto | inventario de datos, retención, borrado, backup TTL, trazabilidad mínima | Antes de clientes |
| SEC-12 | Sobreautomatización que gasta dinero | presupuestos, cuotas, aprobaciones y circuit breaker | Antes de Ads autónomos |

## Principio del mínimo dato
Solo almacenar los datos indispensables para responder solicitudes y medir el servicio contratado. Adjuntos y mensajes deben tener clasificación, propósito, retención y acceso; prohibido subir conversaciones reales a los prompts del repositorio o a fixtures. No registrar cuerpos completos de webhook en logs o CI.

## Roles y autorizaciones
MVP: 1 propietario local. **No hay RBAC multiusuario productivo**.
Planeado: Owner, Operator, Auditor con privilegios mínimos por tenant; secreto de Meta administrado por conexión. Autenticación ↛ autorización para todas las cuentas: validar cada recurso.

## Política de salida de datos hacia LLM
Por defecto **OFF**. Para habilitar: documentar proveedor, tratamiento de datos, costo, finalidad, minimización/redacción, permiso del dueño y revisión jurídica. Un texto del cliente nunca puede alterar las reglas del sistema.

## Kill switches
`ENABLE_META_WEBHOOKS=false` (en laboratorio), `OUTBOUND_ENABLED=false`, `AUTO_REPLY_ENABLED=false`, `AD_SPEND_ENABLED=false`. Son flags conceptuales salvo donde haya código observado; no tratarlos como seguridad suficiente por sí solos. El gate antes de cualquier efecto exige autorización real en backend.

## Legal y operación
Antes de integrar clientes: política de privacidad/consentimiento, retención, encargados de tratamiento, solicitudes de acceso/borrado, revisión de normativa chilena y obligaciones contractuales de Meta. No presentar opinión técnica como asesoría legal.

## Gate de salida del laboratorio
No levantarlo con una sola CI verde. Requiere equipo Windows verificado, cifrado de volumen real, backup restaurado, tests E2E, revisión de seguridad, política de datos, consentimiento y pruebas oficiales sin uso de números personales.

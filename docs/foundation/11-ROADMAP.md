# Roadmap de ejecución y brechas verificables
**Estado:** PROPOSED · Orden por valor, dependencia y riesgo; no por facilidad de generar código.

## Baseline — evidencias a conservar
Repositorio `deepanalytica/conv-os`; rama `feat/acquisition-os` contiene trabajo experimental de CRM, sesiones localhost y respaldos. GitHub Pages es demo pública ficticia. CI en GitHub verifica tests, **no** funcionamiento completo en Windows. PR #1 es borrador, no hay deployment productivo ni Meta conectado.

## P0 — local foundation / E2E Windows
**Objetivo:** instalación reproducible sin tocar `main` ni exponer datos.
- P0-01: determinar carpeta local autorizada tras reconectar Secure MCP Tunnel; si no existe, clonar con Git en ruta controlada.
- P0-02: ejecutar Node/npm, `npm run check`, login, selección WAL/VAA, CRUD demo y pruebas de aislamiento.
- P0-03: verificar BitLocker, respaldos/restauración, cuenta Windows y recuperación de fallos sin datos de clientes.
- P0-04: ejecutar revisión visual y corregir bugs de UI reales; guardar evidencia.
**Gate:** G0–G5, y aprobación humana para comenzar siguiente etapa.

## P1 — contratos y confiabilidad de datos
- P1-01: migraciones SQLite versionadas, auditoría por empresa y rechazo de cruce de datos.
- P1-02: eventos idempotentes, transacciones, límites de uso, política de retención y borrado.
- P1-03: esquema ContactIdentity/ConsentReceipt y datos de prueba anónimos.
**Gate:** negativas de aislamiento/consentimiento y backup antes de migración.

## P2 — Meta test-first SIN usar número real
- P2-01: registrar app Meta y permisos mínimos; revisar alcances aprobados y licencias.
- P2-02: prototipo receptor externo separado: firma, allowlist, límites, cifrado en tránsito/reposo, cola TTL.
- P2-03: cliente local pull con autenticación y ACK tras persistir; simular offline/replay.
- P2-04: conectar cuentas/números de prueba y probar revocación/desconexión.
- P2-05: validar elegibilidad y restricciones del WhatsApp Business actual antes de coexistencia.
**Gate:** firma válida/errónea, enrutamiento correcto por tenant, no exponer dashboard, política de datos revisada y permiso explícito del propietario.

## P3 — circuito de adquisición y conversión reales
- P3-01: entrada autorizada → contacto → oportunidad → diagnóstico/cotización → tarea.
- P3-02: mensajería outbound solo si policy engine permite, revisión humana, logs sin PII y opt-out.
- P3-03: WAL: pedido, pago verificado por proveedor, costos de materiales, preparación y despacho.
- P3-04: VAA: propuesta versionada, contrato y registro de ingresos/costos de delivery.
**Gate:** datos financieros reconciliados y comunicaciones auditables.

## P4 — rentabilidad y escalamiento
- P4-01: atribución, reportes por canal, CAC/margen/contribución con `NO_DATA`.
- P4-02: comparación de experimentos, recomendaciones de IA bajo control de presupuestos.
- P4-03: evaluar multiusuario o nube persistente **solo si** límites locales están observados y hay negocio suficiente.
**Gate:** decisiones por evidencia, métricas de negocio y aceptación humana.

## Matriz de estado inicial (no implica completitud)
| Entregable | Estado actual |
|---|---|
| Repo + CI | IMPLEMENTED; pruebas básicas observadas en GitHub Actions (rama experimental) |
| Login local + SQLite | IMPLEMENTED; E2E en Windows no verificado |
| CRM WAL/VAA + tareas | IMPLEMENTED; solo demo |
| Backups cifrados | IMPLEMENTED; restauración real Windows no verificada |
| Enrutamiento multi-canal oficial | NOT_STARTED |
| OAuth real | NOT_STARTED |
| Coexistencia WhatsApp actual | BLOCKED: elegibilidad y autorización pendientes |
| Gateway HTTPS y cola local pull | NOT_STARTED |
| Pago real verificado | NOT_STARTED |
| Privacidad y auditoría completa | BLOCKED |
| PRAXIOS/Meta-Harness runtime conectado | NOT_STARTED; documentos de gobernanza no son integración |
| Ingresos/CAC/margen real | NOT_STARTED |

## Reglas de priorización
No adelantar UI decorativa, escalamiento SaaS o inversión Ads si P0 y seguridad tienen fallos. Mantener PR pequeños con test negativo; reportar qué ya funciona, qué no, riesgo residual y el próximo paso bloqueante. No prometer fecha o autonomía que dependen de permiso Meta, Windows o comercialización.

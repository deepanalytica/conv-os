# PRD v0.3 — Sistema de adquisición y operaciones multiempresa
**Estado:** PROPOSED · **Propietario de decisión:** usuario · **Producto:** Conv OS + capacidades Acquisition OS.

## Problema
Mensajes comerciales dispersos entre Instagram, Facebook y WhatsApp; ventas sin seguimiento; oportunidades olvidadas; atribución y costos desconocidos; distintos negocios gestionados sin una vista consolidada. Un chatbot aislado no soluciona el registro, la autorización, la operación ni el margen.

## Resultados de usuario
- **WAL (B2C):** consultar regalos → determinar diseño, personalización, cantidades y entrega → cotizar desde catálogo validado → reservar y producir al confirmar pago por proveedor → despachar → medir contribución neta del pedido.
- **Visual Art AI (B2B):** consulta → diagnóstico → calificación → propuesta → negociación → contrato/facturación verificada → renovación/seguimiento → margen por proyecto y valor de cliente.
- **Propietario:** cambiar organización en una UI; ver tareas, respuesta pendiente, conversión y margen; impedir mezcla de datos; mantener WhatsApp Business actual sujeto a verificación de coexistencia.

## Actores
Owner (MVP local), futuro Operator (RBAC por organización), Prospect/Customer, Meta provider, Payment provider, auditor, agente LLM asesor. El modelo puede proponer; el propietario autoriza mensajes sensibles, desembolsos y acciones irreversibles.

## Alcance y criterios
| ID | Necesidad | Aceptación mínima |
|---|---|---|
| FR-01 | Seleccionar organización | Cada lectura/escritura queda aislada por tenant autenticado |
| FR-02 | Captar contacto | Se registra origen, consentimiento con estado inicial `unknown`, fecha y contexto |
| FR-03 | Manejar identidades por canal | No fusionar Instagram/Facebook/WhatsApp por nombre similar |
| FR-04 | Clasificar oportunidad | Etapa, siguiente acción, fecha, responsable y valor estimado |
| FR-05 | Seguir sin spam | Tareas y borradores; envío real solo con permiso, ventana y aprobación |
| FR-06 | WAL pedidos | Precio/costo/cantidad desde reglas del servidor y trazabilidad de personalización |
| FR-07 | VAA ventas consultivas | Diagnóstico, propuesta versionada, decisión y oportunidad |
| FR-08 | Operación comercial | `won` de CRM no equivale a pago confirmado ni despacho |
| FR-09 | Multi-canal Meta | Cuenta real autorizada, IDs de proveedor mapeados a una sola organización |
| FR-10 | Rentabilidad | Facturación verificada, costos variables y CAC separados de estimaciones |
| FR-11 | Continuidad | Sistema local utilizable offline para labores internas; ingreso externo requiere gateway independiente |
| FR-12 | Privacidad | Borrado/exportación, retención, logs minimizados, backups controlados |

## Límites no funcionales
- NFR-01: panel local escuchando solo loopback; rechaza Host/Origin ajenos, sin exponer interfaz al exterior.
- NFR-02: controles de sesión, CSRF, credenciales fuera de Git y cifrado de disco; seguridad validada en Windows antes de PII.
- NFR-03: 100% de escrituras multiempresa con autorización del servidor y pruebas de cruce.
- NFR-04: webhooks con firma verificada, eventos deduplicados e idempotencia incluso tras reintentos.
- NFR-05: métricas etiquetadas por procedencia; sin datos suficientes mostrar «sin datos», no 0 inventado.
- NFR-06: accesibilidad teclado/móvil, contrastes y estados legibles.
- NFR-07: seguimiento y aprobaciones operables sin depender de un LLM.
- NFR-08: evidencia repetible en CI y Windows, con versiones de entorno.

## Fuera de alcance del siguiente MVP
SaaS multioperador público, scraping de perfiles, DMs fríos masivos, CRM omnipotente, agentes que envían o pagan sin revisión, sistema tributario completo, automatizaciones de Ads con presupuesto autónomo, mapas/ruteo salvo que WAL valide necesidad.

## Hipótesis comerciales (no hechos)
H-WAL-01: una oferta limitada de colecciones con personalización guiada elevará conversión y reducirá retrabajo.
H-VAA-01: la calificación y seguimiento de diagnósticos aumentarán propuestas aceptadas.
H-SYS-01: disminuir tiempo de respuesta aumentará oportunidades sin aumentar gasto.
Cada hipótesis requiere baseline, experimento, medición y criterio de abandono definido ANTES del lanzamiento.

## Condiciones para pilotos reales
Autorizaciones Meta y consentimiento, tratamiento de datos y políticas aplicables revisados, aislamiento real, logs protegidos, cifrado/backup-restauración demostrados, controles E2E en Windows, operaciones de pago validadas, límites de automatización y aprobación humana del piloto.

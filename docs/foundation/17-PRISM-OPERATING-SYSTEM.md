# Acquisition OS · Aurora Glass + Orquestación determinista
**Documento PROPOSED · implementación v0.3 en `feat/prism-acquisition-os`. No autorización de producción.**

## 1. Producto: qué opera y qué no

Sistema operativo comercial local-first, multiempresa. WAL cubre pedidos y regalos personalizados; Visual Art AI cubre diagnósticos y servicios B2B. Una instancia comparte motor, interfaz y persistencia, pero **cada consulta está acotada por `tenant_id`**.

El propietario puede registrar contactos, oportunidades, actividades, seguimientos, ofertas, costos directos y borradores de cotización. El centro de mando lee los datos realmente presentes en SQLite y ofrece acciones concretas. Las conexiones Meta siguen sin OAuth en producción; el panel local no se expone públicamente.

**No implementados:** envío efectivo de mensajes, pago/cobro verificado, automación de publicidad, campañas conectadas, CAC y ROAS reales, contratos firmados, gestor documental, roles multiusuario, identidad de cliente entre canales, cotizaciones enviadas y gateway desplegado.

## 2. Ontología ejecutable

Fuente: `src/ontology.js`.

| Entidad | Relación principal | Máquina de estados |
|---|---|---|
| Organization | raíz del workspace | Identidad por tenant |
| Contact | Organization → Contact | Consentimiento no se presume |
| Opportunity | Contact → Opportunity | new → qualified → proposal → negotiation → won/lost |
| Followup | Opportunity → Followup | open → completed |
| Quote | Opportunity → Quote | draft (no envío ni cobro) |
| Recommendation | Opportunity → Recommendation | pending_review → acknowledged/dismissed |
| RuleRun | Organization → RuleRun | completed/failed (contrato) |
| ChannelEvent | Cuenta oficial → metadato | Sin contenido sensible |
| ConsentReceipt | Contact → ConsentReceipt | opt-out prioritario; opt-in manual no verificado |

El contrato identifica explícitamente capacidades `local_read`, `local_write` y `unavailable`. Ningún LLM puede convertir una propuesta en autorización externa.

## 3. Orquestador de acciones

Fuente: `src/operating-system.js`.

### Entrada y planificación

El propietario abre **Orquestación → Evaluar oportunidades**. El motor lee en SQLite las oportunidades abiertas y seguimientos del tenant seleccionado. Aplica tres reglas:

1. `OVERDUE_FOLLOWUP`: seguimiento abierto, fecha anterior al instante de evaluación; prioridad crítica.
2. `OPEN_WITHOUT_FOLLOWUP`: oportunidad activa sin seguimiento pendiente; revisión.
3. `STALLED_OPPORTUNITY`: oportunidad activa sin actualización de etapa en 7 días; revisión.

Las reglas **no envían DMs, no marcan `won`, no editan contactos y no cambian presupuestos**.

### Persistencia y control

- `os_rule_runs`: historial por `tenant_id` y clave de idempotencia única.
- `os_recommendations`: fila única por tenant, regla y sujeto, con revisión humana.
- `os_audit`: actor `local_rule_engine` o `local_owner`, verbo y recurso. No registrar contenido de conversaciones.
- Operaciones de escritura bajo transacción `BEGIN IMMEDIATE`, `COMMIT` / `ROLLBACK`.
- Petición repetida con la misma clave devuelve el resultado anterior; nuevas evaluaciones no duplican recomendaciones.
- El estado `acknowledged` no implica que la tarea se haya ejecutado; no hay autorización saliente.
- Un usuario no puede revisar recomendación de otro tenant. Una recomendación terminal no puede volver a cambiarse en esta versión.

### API autenticada

| Método | Endpoint | Resultado |
|---|---|---|
| GET | `/api/os/ontology` | Vocabulario, invariantes y capacidades |
| GET | `/api/os/analytics?days=7,30,90` | Agregados del tenant y fuentes |
| GET | `/api/os/recommendations` | Cola de revisión humana |
| POST | `/api/os/orchestrate` | Ejecuta reglas locales, `idempotency_key` UUID |
| POST | `/api/os/recommendations/:id/review` | acknowledged/dismissed, auditoría |

La sesión de propietario y CSRF del servidor siguen siendo obligatorios en escrituras. No existen rutas de envío ni cobro.

## 4. Analítica verificable

Fuente: `acquisitionAnalytics` sobre tablas `crm_contacts`, `crm_opportunities`, `crm_followups`, `commercial_quotes` y recomendaciones.

Los indicadores disponibles son **contactos registrados, contactos del período, oportunidades activas, monto estimado de pipeline, declaración de ganados, tareas abiertas/vencidas, cotizaciones borrador, desglose por origen manual y tendencia por fecha de registro**.

| Indicador | Fuente / significado | Estado |
|---|---|---|
| Pipeline | SUM de montos estimados de oportunidades abiertas | Disponible, no cobrado |
| Won | Etapa declarada por operador | Disponible, no pago |
| Presupuestos | Borradores internos de oferta | Disponible, no factura |
| Costos directos | Manual y opcional | Desconocido si falta |
| Ventas cobradas | Integración de pagos autenticada inexistente | `null` (Sin datos) |
| CAC | Spend + clientes atribuibles | `null` |
| ROAS | Ingresos atribuibles + spend | `null` |
| Tiempo de respuesta | Mensajería real ausente | `null` |

El centro de mando diferencia **registro local** de **datos sintéticos en GitHub Pages**. Nunca inventar crecimiento porcentual ni atribución que no se haya medido.

## 5. Sistema de diseño Prism / Aurora Glass

Fuentes: `public/prism-os.css`, `public/insights-ui.js`, `public/orchestration-ui.js`.

- Tokens semánticos: `--prism-bg`, `--prism-panel`, `--prism-text`, `--prism-muted`, `--prism-border`, `--prism-grad`.
- **Oscuro:** obsidiana, cian, violeta, magenta, verde; superficies frosted y acentos iridiscentes.
- **Claro:** blanco perlado, vidrio translúcido, sombras de índigo y acentos vivos sin sacrificar contraste.
- Composición: sidebar, topbar, selector de empresa, hero de identidad, KPI, analítica SVG, etapas, orígenes, agenda, atribución y estado de conexiones.
- Gráficos SVG sin dependencias externas y sin carga remota de fuentes/imágenes.
- Microinteracciones: hover sutil, focus visible, botones con estado y transición; `prefers-reduced-motion` desactiva animaciones.
- Responsive: columnas responsivas, 390 px móvil, 1440 px escritorio. Validar 320 y 768 con tests adicionales.
- Los destellos son elementos decorativos con `aria-hidden`; semántica y números operativos se comunican con texto, no solo color.
- Temas elegidos por usuario desde el control existente y persistidos en navegador.

## 6. Validación, riesgo y roadmap

Pruebas automatizadas:
- `tests/operating-system.test.js`: ontología, contratos, controles tenant, idempotencia y no cobro inventado.
- `scripts/ui-smoke.mjs`: login, dos marcas, tema oscuro/claro, dashboard, formularios y decisiones del orquestador en Chromium.
- `npm run check` con tests y gates PRAXIOS existentes.
- GitHub Actions Windows portable para crear paquete sin credenciales ni PII.

**Gates aún BLOQUEADOS**: revisión visual final en Windows propietario, auditoría de seguridad/privacidad, BitLocker, verificaciones de recuperación, cuentas OAuth Meta, Cloudflare configurado y políticas de envío/retención, conciliación financiera y aceptación humana.

La integración runtime con PRAXIOS sigue pendiente: el contrato de capacidades y el motor de recomendaciones funcionan de manera local, pero no hay agentes externos conectados.

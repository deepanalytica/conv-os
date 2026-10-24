# TDD — Plan de pruebas y aceptación por incremento
**Estado:** PROPOSED · Todo requisito debe mapearse a test y evidencia. **No hay aprobación de producción automática.**

## Formato Gherkin verificable
`Given` identidad, organización, entrada y configuración explícitas; `When` comando/efecto; `Then` status HTTP, cambio persistido, auditoría y NO efectos no autorizados. Cada test incluye un caso negativo.

## Matriz de trazabilidad
| Requisito PRD | Prueba mínima | Evidencia esperada |
|---|---|---|
| FR-01 | Usuario no autorizado intenta consultar/escribir tenant ajeno | HTTP 403/404; filas ajenas 0 |
| FR-02 | Contacto nuevo carece de consentimiento | `unknown` y ningún mensaje automático |
| FR-03 | Dos IDs de canales con mismo nombre | No se fusionan ni se comparten mensajes |
| FR-04 | Stage inválido o salto a ganado | Rechazado; auditoría de transición |
| FR-05 | Seguimiento vencido | Tarea visible; ningún envío ni cron oculto |
| FR-06 | Cliente altera total desde navegador | Total calculado por servidor, no por LLM |
| FR-07 | Propuesta comercial editada tras aceptación | Nueva versión, historial íntegro |
| FR-08 | Opportunity = won sin pago | `payment_verified=false`, ingresos cobrados no cambian |
| FR-09 | Firma inválida, evento duplicado o cuenta desconocida | Rechazo / cuarentena / no duplicación |
| FR-10 | Facturación, costo o atribución faltantes | Métrica `UNKNOWN` y etiqueta de fuente |
| FR-11 | PC apagado, reintentos tras reconexión | Sin duplicar efectos, TTL y pérdida documentados |
| FR-12 | Retención vencida y exportación/borrado | Política aplicada, auditoría sin PII innecesaria |
| NFR-01 | Host/Origin ajenos, TCP no-loopback | Acceso rechazado |
| NFR-02 | Contraseña incorrecta, falta CSRF, cookie vencida | Denegado y estado preservado |
| NFR-03 | UUID de contacto ajeno en oportunidad | Denegado por servidor/BD |
| NFR-04 | Mismo ID con payload diferente | 409/conflicto; sin corrupción |
| NFR-05 | Medida sin evidencia | No se presenta como resultado logrado |
| NFR-06 | Teclado, foco, 320px ancho y contraste | Informe accesibilidad |
| NFR-07 | LLM caído/no configurado | CRM/pedidos siguen funcionando |

## Pirámide
1. **Unitarias:** validaciones, estados, moneda CLP en centavos enteros, consentimiento, reglas de negocio y cálculos.
2. **Integración:** SQLite/transacciones, sesiones, multiempresa, CSRF, webhook firmado, dedupe, persistencia.
3. **Contrato:** fixtures anonimizados de proveedor, versionado, expiración/rotación.
4. **E2E Windows:** inicio, login, cambio WAL↔VAA, creación oportunidad, cierre de tarea, respaldo cifrado/restore, logout.
5. **Seguridad:** secrets scanning, dependencias, límites de carga, SSRF/origin, replay, acceso cruzado, abuso de mensajes.
6. **Recuperación:** caída PC, falta internet, desconexión canal, backup corrupto, restauración íntegra.

## Test financiero crítico
```text
GIVEN pedido WAL awaiting_payment y oportunidad won
WHEN usuario carga una captura o el LLM afirma "pagado"
THEN el pedido no cambia a paid y no se registra ingreso cobrado
AND se conserva actividad con tipo "evidencia no verificada"
```

## Definición de Done (por PR)
- ID de requisito, ADR si cambia estructura o seguridad.
- Pruebas positivas y negativas, con evidencia real de ejecución y comando exacto.
- Capturas UX sin datos personales para pantallas modificadas.
- Sin secretos, regresiones ni rutas públicas al panel local.
- `npm run check` verde + comprobación Windows para afirmar compatibilidad Windows.
- Gate Meta-Harness aprobado para la propiedad comprobada; revisión humana para release.
- Documentación e inventario de riesgos actualizados.

## Comandos base
```powershell
npm run check
npm start
npm run backup:local
npm run restore:local -- "backups\archivo.convbak"
```
En CI no solicitar contraseñas interactivas ni afirmar que ejecutó backup si solo se probó `src/backup-crypto.js`. Reportar pruebas no ejecutadas y su razón explícita.

# UX/UI — Centro de mando comercial
**Estado:** PROPOSED · Objetivo visual: autoridad y claridad operativa, no decoración.

## Principios
1. Cambiar WAL ↔ Visual Art AI ↔ vista consolidada sin mezclar permisos ni datos.
2. Una pantalla responde «¿qué necesita atención?, ¿quién?, ¿qué sigue?, ¿qué evidencia tenemos?».
3. Diferenciar ingreso real, importe estimado, pago pendiente, tarea vencida y mensaje sin responder con **texto + icono + color**, nunca solo color.
4. Del dato a la acción en pocos pasos, sin formularios gigantes ni procesos artificiales.
5. Los estados `DEMO`, `NO_DATA`, `CONNECTED`, `DISCONNECTED`, `WAITING_HUMAN`, `BLOCKED` deben ser explícitos.
6. Interfaz responsive y accesible; teclado completo, focus visible, contraste suficiente, componentes legibles, reducción de movimiento.

## Arquitectura informacional
- **Global:** selector de organización, centro de actividad, seguridad/conexiones, buscador, estado sistema, tareas críticas.
- **Inicio:** bandeja de atención pendiente, oportunidades activas, órdenes y resultados trazables.
- **Conversaciones:** inbox por canal/cuenta con historial y consentimiento, clasificadores no intrusivos, borrador sugerido, botón de aprobar envío.
- **CRM:** pipeline, contacto, identidad, notas, última actividad, próxima acción, fuente y versión de cotización.
- **WAL:** personalización y estado productivo, variantes, costos, lotes, embalaje/despacho.
- **VAA:** diagnóstico, propuestas, contratos, entregables, recurrentes.
- **Rentabilidad:** CAC, costo por pedido/proyecto, contribución, margen, valores `NO_DATA` con enlace a evidencia.
- **Assurance:** panel de gates, riesgos y verificaciones; muestra acciones observables y logs, nunca razonamiento interno privado de LLM.
- **Configuración:** cuentas Meta, estado OAuth, propietarios, políticas de consentimiento, retención, backups y seguridad.

## Dirección de arte
Sistema visual existente: superficies carbón `#090f19`, tarjetas `#111c2b`, acción `#65e3b2`, advertencia `#f6b55a`, error `#ef7979`, texto `#f3f8fc` y secundario `#96a9bd`. Escala base 4px, controles táctiles mínimos 44px, tipografías DM Sans/Plus Jakarta Sans si están disponibles. Documentar tokens compartidos antes de añadir gradientes, animaciones o librerías.

Utilizar jerarquía: métrica primaria → anomalía/próxima acción → detalle/explicación → evidencia. Visualizaciones comparativas solo cuando agreguen comprensión: tendencias por día/semana, desglose de gasto y fuente. No introducir charts de demostración con números inventados sin marca evidente.

## Flujos de prueba de interfaz
- Seleccionar WAL; crear consulta ficticia, oportunidad y tarea; terminar cierre manual (sin marcar cobro real).
- Cambiar a VAA: los contactos WAL no aparecen; completar flujo diagnóstico→propuesta.
- Invalidar sesión: cualquier escritura requiere volver a autenticarse.
- Cuenta Meta `REAUTH_REQUIRED`: visibilidad del problema, sin envíos ni mensajes «entregados» falsos.
- Orden WAL con comprobante por foto: sigue `awaiting_payment` hasta integración financiera autorizada.

## Criterios visuales de aceptación
Capturas responsivas 360px/768px/1440px, contraste AA comprobado, teclado completo, mensajes de error recuperables, tablas scrolleables sin acciones inaccesibles, métricas con unidad/fuente/rango temporal. No lanzar rediseño completo de React sin medición que justifique coste/regresión.

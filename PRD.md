# PRD · Conversation Ops
Versión 0.2 · alcance de MVP técnico

## Visión
Transformar conversaciones de WhatsApp en registros operacionales verificables para empresas de diferentes sectores, mediante un núcleo horizontal configurable.

## Usuarios
Propietario, personal de ventas/recepción, operador, repartidor o técnico; el MVP solo representa propietario/operador en laboratorio, sin RBAC de producción.

## Flujo principal
1. Crear contacto/conversación (webhook Meta entrante cuando esté configurado).
2. Identificar la solicitud y seleccionar productos o servicios existentes.
3. Crear pedido y total en el servidor.
4. Esperar confirmación de pago. En el MVP solo hay pago ficticio manual (sandbox).
5. Procesar, preparar y cerrar la operación.
6. Reflejar estados en el panel y conservar eventos.

## MVP implementado
API HTTP Node con SQLite, empresas de demostración aisladas, catálogo, pedidos con estados, eventos, entrada Meta autenticada con HMAC y dashboard responsive. Vista pública en GitHub Pages con fixture y almacenamiento del navegador sin conectar a clientes.

## Fuera de alcance actual
Mensajes salientes de WhatsApp, autorización multicliente con Meta Embedded Signup, cobro real o conciliación, Routes API, facturación tributaria, roles y permisos, SaaS de producción, observabilidad completa y recuperación ante desastres.

## Métricas
Pedidos iniciados, pedidos sin pago, tiempo hasta cierre, errores de transición, errores de webhook, costo por operación cuando se activen proveedores.

## Criterios de aceptación técnica
- Nunca se marca paid por un mensaje de texto o imagen de comprobante.
- No se permite saltar estados críticos.
- Aislamiento entre empresas verificado con pruebas.
- Webhook rechaza firmas incorrectas y deduplica mensajes por ID externo.
- Dashboard muestra explícitamente que las operaciones son simuladas.
- CI pasa en GitHub Actions antes de considerar un cambio integrable.

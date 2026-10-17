# Seguridad y límites del MVP

La interfaz de GitHub Pages usa información ficticia local. No está conectada a WhatsApp ni a proveedores de pagos. El servidor Node ejecuta una API de laboratorio y no debe publicarse en internet tal como está.

## Implementado
- API con token de laboratorio, protección básica de cabeceras, límite de tamaño en cuerpo y validación HMAC del webhook entrante de Meta.
- Filtro por tenant_id, bloqueo de transición arbitraria hacia paid, consulta de productos del servidor.
- Pago simulado bloqueado cuando el proceso usa NODE_ENV=production.

## Obligatorio antes de usar datos o dinero real
- Identidad por usuario y empresa, sesiones seguras, permisos por función, controles de abuso.
- Entorno de producción con cifrado, copias de seguridad, trazabilidad, cumplimiento de protección de datos y borrado.
- Pasarela con firmas, consulta de confirmación, idempotencia de eventos de pago y conciliación.
- Tokens de Meta gestionados como secretos, permisos autorizados y ventanas de mensajería respetadas.
- Revisión de UX y pruebas end-to-end con casos negativos y recuperación de fallos.

## Regla
Ningún mensaje, captura de transferencia o resultado de un modelo IA acredita un pago. Solo una confirmación auténtica del proveedor de cobro.

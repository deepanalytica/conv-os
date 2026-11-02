# Seguridad · Conv OS local

**Estado: MVP local protegido, NO certificado para datos personales reales ni producción.**

## Protecciones implementadas
- Únicamente `127.0.0.1`: el proceso rechaza escuchar fuera de loopback y comprueba IP, Host y Origin. No exponerlo con túneles ni abrir puertos.
- Inicio de sesión del único propietario: contraseña con scrypt y sal aleatoria en `.local/admin-auth.json` (excluido de Git).
- Cookies de sesión HttpOnly, SameSite=Strict y caducidad; la cookie local no usa Secure porque el navegador se conecta por HTTP exclusivamente en localhost.
- CSRF de sesión para rutas que cambian datos; bloqueo temporal ante intentos fallidos.
- Validación HMAC en webhooks Meta existentes; **su recepción está deshabilitada por defecto** mediante `ENABLE_META_WEBHOOKS`.
- Reglas de dominio deterministas, pago siempre simulado en esta etapa, verificaciones de pertenencia por `tenant_id` y claves foráneas.
- Copias de respaldo independientes con cifrado autenticado AES-256-GCM y derivación de clave scrypt; restauración a nuevo archivo con control de integridad.
- Pantalla pública de GitHub Pages solo con datos ilustrativos, separada del backend local.

## Límites y amenazas pendientes
- **La base SQLite activa NO está cifrada por Conv OS**. Requiere BitLocker/Device Encryption, protección contra malware y cuenta individual Windows.
- No hay RBAC multiusuario ni identidad individual para operadores. El propietario tiene acceso a todas las empresas ficticias.
- Respaldo cifrado se genera manualmente: guardar copias externas, probar restauración y administrar frases de cifrado por separado.
- No se ha auditado el sistema ni probado exhaustivamente en el PC del propietario. CI automatizado no sustituye pentesting ni pruebas end-to-end.
- Falta retención/borrado de datos personales, minimización, consentimiento por canal, control de adjuntos, logs y gestión de acceso.
- Faltan permisos OAuth, enrutamiento multiempresa de eventos y mensajería oficial de Instagram/Messenger/WhatsApp; coexistencia del número real sin configurar.
- Los costos de adquisición, ventas ganadas y precios del CRM son valores de demostración/estimaciones, no ingresos, márgenes ni pagos verificados.
- Una IA no puede autorizar pagos, enviarlos sin aprobación, ni ignorar ventanas/consentimiento.

## Reglas operacionales
1. No importar mensajes o clientes reales hasta resolver los puntos pendientes de protección de datos.
2. No habilitar `ENABLE_META_WEBHOOKS` con el esquema actual global `META_TENANT_ID` para múltiples negocios.
3. No subir `.local/`, `data/`, `backups/`, credenciales ni tokens a GitHub.
4. No modificar `HOST=127.0.0.1` ni deshabilitar CSP/origin/CSRF.
5. Respalda antes de migrar esquemas o actualizar la aplicación.
6. Nunca dar por confirmado un pago por capturas o mensajes: debe comprobarlo el proveedor financiero.
7. Revisar el aviso de privacidad, base legal y controles aplicables en Chile antes de operar con datos de terceros.

Ver [Guía Windows](LOCAL-WINDOWS.md) y [Acquisition OS](ACQUISITION-OS.md).

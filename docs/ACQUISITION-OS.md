# Acquisition OS · Extensión comercial de Conversation Ops

**Estado:** MVP en rama de desarrollo, **solo laboratorio**. No hay cuentas de Meta vinculadas, mensajes enviados, pagos reales ni clientes incorporados.

## Decisión de arquitectura

Se amplía `conv-os` sin crear un repositorio separado. El núcleo de operaciones y pagos simulados se mantiene. El CRM vive en `src/crm.js` y la UI comercial en `public/crm-ui.js` / `public/crm-ui.css`.

Espacios de prueba:
- `demo-wal`: regalos y tazones personalizados, ofertas B2C y pedidos.
- `demo-vaa`: Visual Art AI, diagnósticos, servicios y propuestas B2B.
- Permanecen tres empresas ficticias originales para no perder compatibilidad.

## Cómo probar

```sh
npm run check
npm start
```

Abrir `http://127.0.0.1:4173`, seleccionar WAL o Visual Art AI y entrar a **Adquisición CRM**. El frontend ofrece alta de contacto, oportunidad, pipeline y vistas por empresa.

En GitHub Pages los cambios de CRM son locales al navegador (localStorage), sin red, y desaparecen si se borran los datos del sitio. El backend local usa SQLite. No confundir ninguno con producción.

## API local protegida (sesión local, todavía no apta para clientes reales)

Todas estas rutas requieren una sesión local autenticada mediante cookie HttpOnly. Las operaciones de escritura también necesitan `x-csrf-token`, obtenido desde `/api/auth/session`; `x-tenant-id` identifica la empresa de trabajo del propietario. El token compartido antiguo ya no autoriza la API.

| Ruta | Método | Función |
| --- | --- | --- |
| `/api/crm/contacts` | GET | Lista de contactos de la empresa |
| `/api/crm/contacts` | POST | Nuevo contacto (name, channel) |
| `/api/crm/opportunities` | GET | Lista oportunidades con contacto |
| `/api/crm/opportunities` | POST | Crea oportunidad en etapa new |
| `/api/crm/opportunities/{id}/stage` | POST | Avanza etapa ({stage}) |
| `/api/crm/overview` | GET | Conteos y valor estimado ganado |
| `/api/crm/followups` | GET/POST | Listar y programar tareas manuales |
| `/api/crm/followups/{id}/complete` | POST | Cerrar seguimiento sin enviar mensajes |

`amount_cents` utiliza enteros en centavos. No representa dinero cobrado. La etapa `won` solo registra un estado comercial, **nunca verifica pagos**.

### Pipeline

`new → qualified → proposal → negotiation → won`. Se puede marcar `lost` desde una etapa activa y cerrar como `won` directamente desde `proposal`. No se permite reabrir cierres sin un flujo explícito posterior.

## Protección de datos

- `tenant_id` está en los contactos, oportunidades y eventos; las consultas verifican la empresa.
- Clave foránea compuesta para impedir vincular una oportunidad con un contacto de otro tenant.
- El estado de consentimiento inicia en `unknown`; no se asume autorización para mensajes.
- Las entradas se parametrizan y se validan; las plantillas HTML aplican escape de datos.
- No se envían mensajes a través de las nuevas rutas.

### Bloqueos antes de producción

1. Sustituir el token compartido por autenticación individual, sesiones y RBAC comprobado.
2. Mover Node + SQLite local a una infraestructura persistente, con respaldos y monitoreo (Workers + D1 es una opción, no está implementada).
3. Implementar y aprobar los permisos de Instagram, Facebook Messenger y WhatsApp.
4. Para conservar la aplicación WhatsApp Business, evaluar *Coexistence/Embedded Signup* con el número **sin migrarlo unilateralmente**.
5. Diseñar el enrutamiento de webhooks por cuenta oficial autorizada (ID de página/cuenta/phone number) hacia su tenant. No usar `META_TENANT_ID` global con múltiples empresas.
6. Verificación de credenciales y revocación, límites de envío, consentimiento y ventanas de mensajería.
7. E2E de autenticación, UI, recuperación de fallas, datos y carga.
8. Configurar precios/catálogos reales solo después de validación comercial. Las cifras de demostración no son propuestas de precio.

## Próximos incrementos

- **Seguridad:** OIDC/RBAC y tenancy resistente a accesos entre organizaciones.
- **Integraciones:** OAuth, webhooks multi-cuenta y bandeja real; primero números de pruebas.
- **Operación:** seguimiento, cotizaciones, producción WAL, propuestas VAA.
- **Analítica:** fuente, campaña, tasa de respuesta, conversión, márgenes y atribución verificable.

Cada incremento debe acompañarse de pruebas; no representar funcionalidades pendientes como operativas.

## Operación local y autonomía controlada

Para iniciar en Windows, configurar la clave, crear respaldos cifrados y revisar los riesgos, seguir [LOCAL-WINDOWS.md](LOCAL-WINDOWS.md). Los seguimientos generan tareas y alertas visuales; no envían comunicaciones automáticas ni consumen cuentas Meta. El sistema es local, y cualquier conexión exterior será un incremento aparte con revisión de privacidad.

# Arquitectura · Conversation Ops v0.2

## Modelo actual
Monolito modular ligero.
- `src/domain.js`: reglas deterministas, precios, cobertura y transiciones.
- `src/server.js`: API REST, SQLite, webhooks entrantes Meta, acceso controlado para laboratorio.
- `public/`: vista operativa web y demostración autónoma para GitHub Pages.
- `tests/`: pruebas de dominio y API.
- `.github/workflows/`: CI y despliegue estático.

## Tenancy
Toda operación y mensaje posee tenant_id. Las consultas deben filtrar por tenant_id y validar pertenencia. En v0.2 el token compartido solo se admite en entorno local: para clientes reales se requieren identidad personal, sesiones y RBAC.

## Transacciones
SQLite almacena pedidos e historial. En el laboratorio los cambios de estado son síncronos; para producción deben encapsularse en transacciones con concurrencia, idempotencia y entrega de eventos persistente.

## Integraciones futuras
Meta Cloud API oficial (entrada + salida, aprobación de app); proveedor de cobros con notificaciones verificadas; rutas y ETA por carretera; notificaciones a personal autorizado.

## Seguridad
El backend contiene guardas para no iniciar en NODE_ENV=production; la demo pública no tiene backend ni datos reales. No se deben almacenar tokens, números reales ni claves en el repositorio. Antes de SaaS adoptar PostgreSQL con políticas por tenant, OIDC/RBAC, rate limit, CSRF si usa cookies, secretos administrados, auditoría, backup y monitoreo.

## Hosting
GitHub Pages publica solo `public/` como experiencia de demostración. SQLite y Node requieren infraestructura persistente separada. Cloudflare Workers + D1 es posible como arquitectura objetivo, pero exige un adaptador de persistencia y autenticación de producción: **no se considera implementado**.

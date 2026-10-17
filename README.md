# Conversation Ops · conv-os

**Sistema operativo empresarial construido alrededor de conversaciones.** Base horizontal para gastronomía, servicios, distribución y otros negocios que atienden por WhatsApp.

> **Estado: MVP experimental v0.2. No utilizar con datos reales, pagos reales o clientes sin completar seguridad, autorización e integraciones.**

## Qué incluye
- API Node.js 22.13 con SQLite nativo, aislamiento básico por empresa y datos ficticios.
- Catálogo, creación de operaciones, cálculo de totales y máquina de estados.
- Pago **únicamente simulado** en modo de laboratorio; el usuario jamás puede cambiar un estado a pagado por texto libre.
- Webhook Meta entrante con validación HMAC SHA-256 y deduplicación.
- Interfaz responsive con panel, tres empresas de ejemplo, operaciones, eventos y estados.
- Demostración pública **100% estática** con datos simulados en el navegador.
- GitHub Actions para pruebas, sintaxis y publicación de GitHub Pages.

## Uso local (backend + interfaz)
Node.js 22.13 o superior:

```bash
npm run check
npm start
```

Abrir `http://127.0.0.1:4173`. La base SQLite se crea en `data/ops.sqlite`. El token de prueba es solo local. Para modificar la API fuera de localhost se requiere una implementación segura de identidad y permisos, que todavía no existe.

## GitHub Pages
**Demo visual:** [Conversation Ops — GH Pages](https://deepanalytica.github.io/conv-os/) (solo cuando GitHub Pages esté habilitado y el workflow termine correctamente).

Si el enlace no carga, entrar en **Settings → Pages → Build and deployment → Source: GitHub Actions**, y revisar el workflow [Public demo · GitHub Pages](https://github.com/deepanalytica/conv-os/actions/workflows/pages.yml).

Las operaciones de esta demo no se envían a servidores, bancos ni WhatsApp.

## GitHub Actions
- [Fullstack CI](https://github.com/deepanalytica/conv-os/actions/workflows/ci.yml): `npm run check`.
- [Public demo · GitHub Pages](https://github.com/deepanalytica/conv-os/actions/workflows/pages.yml): publica `public/` como demo estática.

## Qué falta para producción
Autenticación RBAC por empresa, aislamiento comprobado a nivel de datos, base de datos apta para producción, Meta Embedded Signup, salida de mensajes WhatsApp, pagos verificados por proveedor, mapas y ETA reales, límites de consumo, observabilidad, tratamiento de datos personales, pruebas E2E y despliegue de backend persistente.

GitHub Pages **no ejecuta Node ni SQLite**. Cloudflare Workers + D1 podría ser una futura infraestructura, pero requerirá portar el adaptador de datos, configurar secretos y completar controles de producción; no se presenta como implementado.

## Documentación fundacional
[PRD](PRD.md) · [Arquitectura](ARCHITECTURE.md) · [Design System](DESIGN_SYSTEM.md) · [Agentes](AGENTS.md) · [Despliegue](docs/DEPLOYMENT.md).

La marca es provisional. El producto se configura para cada empresa, no está ligado a ningún restaurante.

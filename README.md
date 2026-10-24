# Conversation Ops · conv-os

**Sistema operativo empresarial construido alrededor de conversaciones.** Base horizontal para gastronomía, servicios, distribución y otros negocios que atienden por WhatsApp.

## Desarrollo de Acquisition OS (rama feat/acquisition-os)

Se agregó una primera capa de **CRM comercial multiempresa**, reutilizando el backend, las pruebas y la interfaz existente: WAL (regalos personalizados) y Visual Art AI (servicios digitales) comparten panel con espacios independientes. Incluye contactos, oportunidades, pipeline, métricas estimadas y alta manual de registros.

**Para probar:** seleccionar una de las marcas en el panel y entrar a **Adquisición CRM**. En la demo pública, los registros viven solo en el navegador; en el backend local usan SQLite. No existen integraciones reales con Meta ni clientes de producción. **No usar para datos privados ni ventas reales.**

Guía técnica, endpoints, riesgos y pasos siguientes: [Acquisition OS](docs/ACQUISITION-OS.md).



> **Estado: MVP experimental v0.2. No utilizar con datos reales, pagos reales o clientes sin completar seguridad, autorización e integraciones.**

## Versión premium · octubre 2026

- **[Abrir UI premium](https://deepanalytica.github.io/conv-os/)** — panel operativo, inbox ilustrativo, gestión de pedidos y estados.
- **[Ver landing](https://deepanalytica.github.io/conv-os/landing/)** — presentación comercial responsive y escenarios por industria.
- **[GitHub Actions](https://github.com/deepanalytica/conv-os/actions)** — verificación del código y publicación automática.

La bandeja muestra conversaciones **reconstruidas a partir de pedidos ficticios** para ilustrar la experiencia; no accede a mensajes reales.
No se ha activado una conexión auténtica con WhatsApp Business, una pasarela bancaria ni una API de mapas.
La landing es un diseño promocional, no una página que procese formularios de inscripción.

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

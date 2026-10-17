# Conversation Ops · conv-os

**Sistema operativo comercial basado en conversaciones.** Núcleo horizontal para restaurantes, servicios, distribuidores y otros negocios que reciben solicitudes por WhatsApp.

## Estado
MVP **experimental**, no apto para pagos reales. Incluye interfaz local, motor de operaciones, pruebas e integración entrante de Meta (requiere credenciales). La salida real de WhatsApp, cobros bancarios y distancias/ETA requieren integraciones pendientes.

## Arquitectura
Node.js 22 + SQLite experimental + frontend web sin dependencias. El servicio persistente NO puede ejecutarse en GitHub Pages: la publicación de Pages, si se habilita, será solamente una demo estática. CI con GitHub Actions verifica sintaxis, pruebas y controles de seguridad.

## Ejecutar
```bash
npm run check
npm start
```
Abrir `http://127.0.0.1:4173`.

## Reglas
Nunca tratar capturas de transferencias como pago verificado. No exponer tokens ni datos de clientes. No habilitar datos reales ni modo demostración en producción. Una integración externa no se declara activa hasta probar sus webhooks y credenciales.

Documentos: `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `AGENTS.md`.

**Repositorio:** deepanalytica/conv-os · piloto sectorial configurable, sin marca de un restaurante específico.

# ADR-0001 — Local-first con gateway público mínimo separado
- **Estado:** PROPOSED (requiere aceptación humana)
- **Fecha:** 2026-10-23
- **Dueño:** propietario de Conv OS
- **Decisión en evaluación:** mantener panel, SQLite y actividades privadas en Windows; exponer en el futuro solo un receptor HTTPS sin lectura de datos de clientes ni acceso al dashboard.

## Contexto
El propietario administra WAL y Visual Art AI, quiere privacidad y control de conversaciones. Meta necesita webhooks públicos para determinados eventos; Windows puede apagarse. GitHub Pages solo sirve contenido estático y no es lugar para mensajes reales.

## Alternativas
A. **Panel público y DB cloud**: alta disponibilidad, mayor superficie pública y complejidad de protección, permisos y costos.
B. **Cloudflare Tunnel directo a Node local**: rápido, pero amplía superficie; contradice regla local-only actual; riesgo operacional si no hay gateway/identidad separados.
C. **Gateway público mínimo + cola TTL + pull local (preferida para prototipo futuro)**: equilibra aislamiento con recepción externa; implica gestionar datos temporalmente en nube y definir retención, cifrado y cumplimiento.
D. **Solo local sin integraciones**: privacidad más simple, pero no puede recibir webhooks cuando el PC está apagado.

## Decisión propuesta
Mantener la solución D para el laboratorio. Avanzar a C solo tras controles P0/P1, seguridad, autorización de Meta, pruebas y aceptación de privacidad. Nunca pasar a B por conveniencia sin nuevo ADR.

## Consecuencias
- Positivas: dashboard privado, menor exposición del computador, despliegue incremental y costo controlable.
- Negativas: diseño de colas, sincronización, administración de secretos y posible pérdida de eventos por TTL/offline.
- Reversibilidad: gateway es módulo reemplazable, panel y dominio permanecen intactos.
- Evidencia requerida: pruebas de ruta pública limitada, aislamiento, deduplicación, reintentos, offline/replay, revocación y auditoría.

## Control de validez
No se declara esta arquitectura implementada. Para convertir ADR a ACCEPTED se exige revisión del propietario y, para producción, una revisión de riesgos y datos de clientes.

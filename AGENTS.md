# AGENTS.md · Reglas de trabajo

## Primero
Leer README, PRD, ARCHITECTURE y DESIGN_SYSTEM antes de cambiar código. Este repositorio es horizontal: **no** renombrarlo según un restaurante o negocio piloto.

## Invariantes
1. Pagos confirmados solo por integración validada; endpoint de simulación únicamente en sandbox.
2. Toda consulta sensible debe aislar datos por tenant.
3. Totales y tarifas los calcula el servidor; IA nunca decide precios ni verificación bancaria.
4. Prohibido introducir credenciales o datos reales en fixtures o repositorio.
5. Cualquier cambio a estados necesita prueba negativa de transición.
6. WhatsApp debe usar la API oficial y firmas verificadas.

## Rutina
- Cambio pequeño con tests y documentación juntos.
- Ejecutar `npm run check`.
- No exponer el servidor local a internet con el token de demo.
- GitHub Pages solo puede anunciarse como demo estática.
- No declarar integraciones reales operativas antes de pruebas E2E con credenciales propias.

## Definición de terminado
Código validado, pruebas verdes, aislamiento y seguridad revisados, UI responsiva verificada, modo demo explícito y documentación actualizada.

## Invariantes de la instalación local
- No permitir `HOST` distinto de `127.0.0.1` ni publicar el panel por túneles o proxies.
- APIs protegidas con sesión HttpOnly y CSRF. Prohibido restablecer el token compartido de prueba.
- Exclusión de Git para `.local/`, `data/` y `backups/`; nunca registrar claves, números reales o credenciales.
- Receptor Meta deshabilitado por defecto. Las conexiones oficiales requieren OAuth, consentimiento y pruebas de enrutamiento por cuenta.
- Los seguimientos son tareas internas, nunca mensajes salientes automáticos.
- `won` en CRM es valor estimado; no representa pago o ingreso verificado.
- Cambios en seguridad: añadir pruebas negativas de autenticación, origen, aislamiento y filtración de datos.

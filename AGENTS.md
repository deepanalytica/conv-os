# AGENTS.md · Reglas de trabajo

## Primero
Leer `README.md`, `docs/foundation/00-INDEX.md`, `docs/foundation/status.json`, `docs/foundation/01-PRD.md`, `docs/foundation/02-SDD.md` y `docs/foundation/05-TDD.md` antes de cambiar código. Revisa `PRD.md`, `ARCHITECTURE.md` y `DESIGN_SYSTEM.md` como legado contextual. Este repositorio es horizontal: **no** renombrarlo según un restaurante o negocio piloto.

### Autoridad y alcance de los agentes
- Los documentos en `docs/foundation/` están `PROPOSED` hasta revisión humana: especificar no equivale a aprobar.
- El LLM genera código y propuestas, no es frontera de seguridad ni fuente de verdad de resultados.
- PRAXIOS coordina pasos; Meta-Harness verifica reglas, evidencia y gates. **No declarar integración runtime sin evidencia**.
- Cada trabajo debe mapear tarea a FR/NFR, estados `docs/foundation/03-STATES.md`, contratos `04-CONTRACTS.md` y tests `05-TDD.md`.
- Los efectos irreversibles, gastos, comunicaciones reales y cambios del número WhatsApp exigen autorización humana explícita.
- Dejar relevo verificable con rama, commit, pruebas, bloqueos y próxima acción según `08-EVIDENCE-AND-HANDOFF.md`.
- No introducir nuevas capas, migración tecnológica o reescrituras sin ADR con comparación de alternativas y prueba del beneficio. Este repositorio es horizontal: **no** renombrarlo según un restaurante o negocio piloto.

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
- No exponer el servidor local a internet. El token de demo anterior fue reemplazado por autenticación del propietario en la rama experimental.
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

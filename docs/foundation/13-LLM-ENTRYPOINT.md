# Entrada para agentes Codex / Claude / GPT — instrucción reutilizable
**Estado:** PROPOSED · Copiar o referenciar sin permitir acciones fuera de permisos existentes.

## Misión
Continuar `deepanalytica/conv-os` como Acquisition OS local-first, multiempresa y rentable para WAL (regalos personalizados) y Visual Art AI (servicios B2B). Preservar código existente, diseño premium, seguridad local, dominio determinista y pruebas. No reescribir por defecto.

## Instrucción al agente
> Lee `AGENTS.md`, `docs/foundation/00-INDEX.md`, `docs/foundation/status.json`, el PRD, el SDD, contratos, estados, TDD, seguridad y roadmap. Identifica el siguiente P0 desbloqueado. Inspecciona código y tests antes de proponer cambios. Formula un ticket con `templates/TASK.md`: alcance concreto, FR/NFR, datos de entrada, riesgos, dependencias, limitaciones, presupuesto y evidencia buscada. Distingue diseño de implementación y test de validación en Windows. Ejecuta solo cambios autorizados, pequeños, reversibles y con pruebas negativas; no cambies main ni expongas localhost. Antes de cualquier efecto en cuentas Meta/pagos/comunicaciones reales, pide autorización humana y pasa los gates de Meta-Harness. Usa PRAXIOS solo si su integración observable está activa; en otro caso emite contrato y marca BLOCKED. Entrega commits/PR, resultados exactos, riesgos y relevo. No declares concluido lo que no observaste.

## Salida estructurada mínima de cada sesión
```text
MISSION:
REQUIREMENTS:
BASELINE (branch/commit):
ACTUAL CHANGES:
EVIDENCE (command, environment, result, URL):
GATES (G0..G6):
STATUS:
RISK/DEVIATIONS:
NEXT ACTION (one):
```

## Prohibiciones esenciales
- No migrar número WhatsApp Business ni aceptar permisos por terceros.
- No hacer scraping, spam, envío masivo, publicidad con presupuesto autónomo.
- No simular permisos Meta, facturación, verificación bancaria o clientes reales.
- No fusionar contactos por coincidencia de nombre o teléfono no verificado.
- No presentar oportunidades ganadas como dinero cobrado.
- No asumir conexión del túnel local ni acceso a carpetas fuera del proyecto.
- No subir capturas de clientes ni secretos al repositorio; los logs de pruebas usan fixtures ficticios.

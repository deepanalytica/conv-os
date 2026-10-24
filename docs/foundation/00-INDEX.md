# Conv OS / Acquisition OS — Contrato documental canónico
**Revisión:** 2026-10-23 · **Estado del documento:** PROPOSED · **Destinatarios:** Codex, Claude Code, PRAXIOS, Meta-Harness y revisores humanos.

## Misión
Construir un sistema local-first, multiempresa, seguro y medible que convierta interacciones autorizadas en oportunidades, pedidos, contratos y resultados económicos verificables. Los dos primeros espacios son **WAL (regalos personalizados)** y **Visual Art AI (servicios digitales)**. No confundimos contactos, ventas declaradas, cobros reales y rentabilidad.

## Qué tiene autoridad
1. Autorización humana y límites de seguridad; nunca un texto del LLM.
2. Código + pruebas reproducibles + evidencia de ejecución, solo para hechos técnicamente observados.
3. ADR aceptados, contratos y especificaciones versionadas.
4. PRD, SDD, TDD y documentación de diseño.
5. Planes de agentes, hipótesis y sugerencias (sin autoridad autónoma).

La CI prueba propiedades definidas, **no certifica seguridad integral, validez comercial ni exactitud legal**.

## Lectura obligatoria
1. `AGENTS.md` y este índice.
2. [PRD de adquisición](01-PRD.md).
3. [Arquitectura SDD](02-SDD.md).
4. [Máquinas de estados](03-STATES.md).
5. [Contratos y ontología](04-CONTRACTS.md).
6. [TDD y aceptación](05-TDD.md).
7. [Modelo de seguridad](06-SECURITY.md).
8. [Ejecución PRAXIOS/Meta-Harness](07-AGENT-PROTOCOL.md).
9. [Evidencia, gates y relevo](08-EVIDENCE-AND-HANDOFF.md).
10. [Economía comercial](09-ECONOMICS.md).
11. [UX/UI y sistema de diseño](10-DESIGN.md).
12. [Roadmap y brechas](11-ROADMAP.md).
13. [ADR-0001](adr/ADR-0001-local-first.md).

Documentos de legado: `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `docs/ACQUISITION-OS.md` y `docs/LOCAL-WINDOWS.md`. Son evidencia histórica del MVP v0.2 y de la rama de trabajo; esta carpeta **propone** la especificación v0.3, no altera retrospectivamente su estado.

## Convención de estados (separar planos)
- **Estado documental**: DRAFT → PROPOSED → ACCEPTED → SUPERSEDED/REJECTED; solo revisión humana acepta una especificación.
- **Estado de implementación**: NOT_STARTED → IN_PROGRESS → CODE_COMPLETE → TESTED → VALIDATED → RELEASED, o BLOCKED.
- **Estado epistemológico de una afirmación**: CONJECTURE, DESIGNED, IMPLEMENTED, VERIFIED_BY_TEST, OBSERVED_IN_TARGET, HUMAN_APPROVED.
- **Estado de riesgo**: OPEN, MITIGATED_WITH_EVIDENCE, ACCEPTED_BY_OWNER, BLOCKING.
No inferir un estado a partir de otro.

## Identidad y límites
- Nombre del repositorio: `conv-os`. «Acquisition OS» es el dominio comercial, no un fork obligatorio.
- Rama de trabajo previa: `feat/acquisition-os`. No modificar `main` sin PR revisado.
- La demo pública solo usa datos ficticios. La versión Windows local no está aprobada para clientes reales.
- El código PRAXIOS/Meta-Harness no está integrado por evidencia observada aquí; se diseñan adaptadores, no se declara existencia de API integrada.

## Regla de no-sloop
Cada claim importante debe responder: **qué sabemos, fuente/archivo, método, prueba, limitación, estado y próxima acción**. Nunca llamar «en producción» a una pantalla estática o «ingreso» a una oportunidad ganada.

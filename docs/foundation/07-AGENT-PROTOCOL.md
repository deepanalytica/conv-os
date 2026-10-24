# Protocolo de desarrollo asistido — PRAXIOS + Meta-Harness
**Estado:** PROPOSED · Adaptación de principios PRAXIOS/Meta-Harness al repositorio; no implica integración de runtimes.

## Separación de responsabilidades
- **Humano/owner:** define misión, acepta alcance y riesgo residual, autoriza comunicaciones y cambios irreversibles.
- **EULER / planeador (si disponible):** convierte intención en entregables concretos, dependencias y pruebas. No tiene autoridad técnica por sí mismo.
- **PRAXIOS / execution plane:** orquesta pasos, actores, herramientas, contexto y checkpoints, preservando el estado verificable.
- **Meta-Harness / assurance plane:** valida contratos, evidencia, trazabilidad, políticas, efectos, incertidumbre y gates antes de permitir avanzar.
- **Atalaya / supervisión (si disponible):** identifica desviaciones, bucles, sobreingeniería y degradación de misión observables; no presume leer razonamiento privado.
- **EUREKA / cosecha (si disponible):** propone reutilizar hallazgos con procedencia, nunca canoniza por cuenta propia.
- **Agente implementador (Codex/Claude/etc.):** produce cambios y tests; nunca adjudica a su propia propuesta estado `HUMAN_APPROVED`.

Los nombres anteriores son roles arquitectónicos derivados del marco del usuario. **No hay prueba de conectividad PRAXIOS externa en conv-os**. Los contratos son compatibles con una futura integración, implementable por adaptador pequeño.

## Ciclo obligatorio de un cambio
1. **INTAKE:** tarea con problema, valor de negocio, FR/NFR, restricción, propietario, riesgo, no-alcance.
2. **EVIDENCE:** localizar código y tests actuales antes de proponer nuevas capas.
3. **PLAN:** descomponer en pasos pequeños; declarar dependencias, reversibilidad y límite de esfuerzo.
4. **GATE BEFORE EFFECT:** policy + permisos + contexto por tenant + presupuesto.
5. **IMPLEMENT:** cambios pequeños en rama; prohibido alterar `main` en directo.
6. **VERIFY:** tests positivos y negativos; distinguir observación de hipótesis.
7. **REVIEW:** Meta-Harness emite ALLOW/DENY/REVIEW sustentado; humano aprueba pasos sensibles.
8. **HANDOFF:** registrar estado, commit, PR, CI, limitaciones, siguiente paso y bloqueo.
9. **CLOSE:** solo si acceptance criteria completos y comprobables.

## Gates mínimos por PR
- G0 **MISSION:** trazabilidad requisito → tarea → archivo.
- G1 **SCHEMA:** contratos, invariantes, tipos, migraciones, compatibilidad.
- G2 **EVIDENCE:** salidas observables, comandos y fuente de cada claim.
- G3 **CONSISTENCY:** no contradice estados existentes ni duplica sistema.
- G4 **SAFETY:** permisos, privacidad, secrets, no exposición ni pagos falsos.
- G5 **REGRESSION:** unit, integration, negative y CI.
- G6 **RELEASE:** deploy/rollout con permiso humano; para Meta/pagos necesita autorización explícita.

Resultado por gate: `ALLOW` / `DENY` / `REVIEW`. `REVIEW` no es aprobación. Si falla G4, bloquear efecto aunque G5 esté verde.

## Restricciones anti-sobreingeniería
- Una necesidad = contrato mínimo = test mínimo = cambio mínimo.
- No introducir Rust, microservicios, React, Kafka, vector DB o nuevos agentes solo por prestigio arquitectónico. Requerir ADR con métricas y alternativas.
- No convertir PRAXIOS en dependencia runtime para tareas deterministas que hoy resuelve Node/SQLite.
- No gastar tokens en reiterar planes sin cambios medibles. Cada ciclo termina en commit, prueba o bloqueo explícito.
- No publicar pantallas que simulen estado real sin etiqueta `DEMO`.

## Contrato propuesto por step
```json
{
  "mission_id": "uuid",
  "step_id": "uuid",
  "revision": 1,
  "requirement_ids": ["FR-01"],
  "dependencies": [],
  "capability": "github.write.branch",
  "risk": "low|medium|high",
  "deadline": "ISO-8601-or-null",
  "budget": {"calls": 20, "cost_usd_max": null},
  "policy_digest": "sha256",
  "idempotency_key": "uuid",
  "human_approval_required": false
}
```
Campos que no existen en el runtime se marcan `UNIMPLEMENTED`; jamás se rellenan fingiendo ejecución.

## Orden mínimo para nuevo agente
1. Leer `AGENTS.md`, `docs/foundation/00-INDEX.md`, `docs/foundation/11-ROADMAP.md`.
2. Buscar pruebas y código de la tarea.
3. Leer el ADR relevante y estado `docs/foundation/status.json`.
4. Elegir el siguiente ticket P0 desbloqueado.
5. Trabajar en rama feature, correr pruebas, guardar verificaciones y actualizar el ticket.
6. Si falta entorno/permiso/evidencia, entregar `BLOCKED` y instrucciones concretas, no inventar solución.

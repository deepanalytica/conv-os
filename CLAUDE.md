# CLAUDE.md — reglas de trabajo para Claude Code

Este repositorio **no** es un playground de agentes. Antes de modificar archivos:
1. Leer `AGENTS.md`, `docs/foundation/00-INDEX.md` y `docs/foundation/status.json`.
2. Consultar PRD/SDD/TDD/estados/contratos aplicables.
3. Evaluar impacto de seguridad y multiempresa, plan mínimo y prueba negativa.
4. Trabajar sobre rama de desarrollo y PR. No modificar `main` directamente.
5. Ejecutar `npm run check`, reportar ambiente y pruebas realmente ejecutadas.
6. Enviar relevo en formato `docs/foundation/templates/HANDOFF.md`.

**Gobernanza:** PRAXIOS orquesta, Meta-Harness controla contratos/gates/evidencia, el humano autoriza. Una respuesta de LLM no comprueba una integración, pago ni permiso. No publicar secretos, números, contactos reales o mensajes. No enviar mensajes ni gastar presupuesto sin autorización.

Los documentos `PROPOSED` son especificaciones pendientes de aceptación humana; usarlos como hipótesis de trabajo, no como autoridad irrevocable. Si no se puede probar en Windows o conectarse a PRAXIOS, declarar `BLOCKED` con evidencia y paso siguiente.

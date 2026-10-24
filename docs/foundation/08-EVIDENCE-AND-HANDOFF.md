# Evidencia, trazabilidad, checkpoints y relevo entre LLM
**Estado:** PROPOSED · Meta-Harness verifica pruebas y políticas; no valida intuiciones.

## Afirmación con expediente
Cada afirmación relevante necesita `claim_id`, texto acotado, estado epistemológico, método, artefacto/URL estable, hash o commit, entorno, fecha, limitaciones y quién verificó. «CI pasó» respalda tests ejecutados, **no** «seguridad sin riesgos».

## Cinco fronteras de control
1. **Entrada:** origen legítimo, intención no ambigua, datos autorizados.
2. **Conocimiento:** hechos vs deducciones, procedencia y contradicciones.
3. **Ejecución:** capability, límites, permisos, costos, transacciones, idempotencia.
4. **Emisión:** nada de mensajes, gastos o publicaciones sin gate pertinente.
5. **Cierre:** pruebas, outcomes observados, acciones pendientes, responsabilidad del humano.

## Registro propuesto de verificación
```json
{
  "verification_id": "uuid",
  "requirement_id": "NFR-01",
  "claim": "El backend rechaza Host ajeno",
  "artifact": "tests/api.test.js",
  "commit_sha": "actual-commit-sha",
  "command": "npm run check",
  "environment": "GitHub Actions Node 22.13",
  "result": "PASS|FAIL|NOT_RUN|INCONCLUSIVE",
  "evidence_url": "exact-workflow-run-url",
  "limitations": ["No se comprobó en Windows"],
  "verified_at": "ISO-8601",
  "gate": "G5",
  "gate_decision": "ALLOW|DENY|REVIEW",
  "reviewer": "human|policy-engine|tool"
}
```
Los campos del ejemplo no son evidencias reales: deben sustituirse solo con valores observados.

## Relevo firmado por estado, no por narrativa
Cada sesión deja en `docs/foundation/handoffs/` un archivo `YYYYMMDD-<id>.md` con:
- Misión y propósito (no reescribir).
- Rama, commit, PR, archivos modificados y resumen mínimo.
- Estados por deliverable: NOT_STARTED, IN_PROGRESS, TESTED, BLOCKED...
- Pruebas realizadas con comando, entorno, enlace y resultado.
- Claims sin demostrar / incertidumbre / desviaciones.
- Cambios de política, riesgos abiertos y propuestas de ADR.
- Próxima acción exactamente una, dependencias y responsable.
- Necesidades de consentimiento/autorización humana.

## Auditoría de desviaciones
`DEVIATION_ID`, plan original, diferencia observada, por qué ocurrió, impacto, remediación y autoridad que acepta. No esconder fallos de CI ni «corregir» el plan retrospectivamente para parecer exitoso.

## Contradicciones y evidencia
- PRD dice «no enviar»: un agente no puede activarlo por optimización.
- Documentos dicen «gate aprobado», CI dice FAIL: gate es DENY hasta aclarar.
- PR dice «publicado», deployment no existe: estado real es CODE_COMPLETE.
- Pantalla muestra «ganado» sin pago: solo valor estimado.
- Una prueba en sandbox jamás basta para declarar WhatsApp real vinculado.

## Evidencia reproducible
Guardar enlace al commit, salida resumida del test, ambiente, seed ficticio, casos negativos, limitaciones; jamás tokens, contraseñas, nombres reales de clientes ni contenido de conversaciones.

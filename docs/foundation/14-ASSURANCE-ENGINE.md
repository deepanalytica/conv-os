# Meta-Harness ejecutable v0.1 — gates conservadores
**Estado documental: PROPOSED.** Implementación técnica parcial. No representa una conexión al runtime externo de PRAXIOS ni certifica seguridad.

## Qué cambió

Las reglas de seguridad y el PRD pueden consultarse ahora desde un motor determinista:

- `src/assurance.js`: valida propuestas de pasos (UUID, requisitos del PRD, digest de política, presupuesto, riesgo y capacidad). Devuelve `ALLOW`, `REVIEW` o `DENY` con el gate y la explicación.
- `scripts/assurance-check.mjs`: inspección estática anti-regresiones de ocho invariantes que *deben seguir presentes*, además de evaluación de una propuesta segura local. Es una guarda sintáctica: pasarla **no demuestra** que todo el sistema sea seguro.
- `tests/assurance.test.js`: pruebas negativas: propuesta con digest obsoleto, requisitos inexistentes, capacidad desconocida, aprobación autodeclarada, eliminación de la verificación de sesión o liberación prematura.

Ninguna de estas piezas ejecuta servicios de terceros; son una **primera implementación local de un contrato de verificación**.

## Matriz de autoridad

| Tipo de paso | Resultado automático máximo | ¿Ejecuta el motor? |
| --- | --- | --- |
| `repo.read`, `docs.read`, `local.check` | `ALLOW` limitado al plan | No, solo propone evaluación |
| `repo.write.branch`, `docs.write`, `github.pr.create` | `REVIEW` | No. Codex/humano deben autorizar según permisos reales |
| `meta.message.send`, `meta.account.connect` | `DENY` | Jamás desde este motor |
| `payments.capture`, `advertising.spend` | `DENY` | Jamás desde este motor |
| `production.deploy`, `whatsapp.number.migrate`, `secrets.export` | `DENY` | Jamás desde este motor |

Incluso si un LLM aporta `human_approved: true` en un campo inventado, no se concede autoridad para un efecto externo. Un sistema futuro necesitará aprobación autenticada externamente, un adaptador de herramientas permitido, tokens con alcance mínimo y registro de recibos.

## Comandos

```powershell
npm run check
npm run docs:check
npm run assurance:check
```

Para obtener el digest actual que debe indicar una propuesta:

```powershell
node --input-type=module -e "import {POLICY_DIGEST} from './src/assurance.js'; console.log(POLICY_DIGEST)"
```

Para evaluar una propuesta creada en un archivo local ignorado por Git (solo contenido no sensible):

```powershell
node scripts/assurance-check.mjs .local/step-proposal.json
```

El archivo debe contener el objeto `StepProposal` de [protocolo de agentes](07-AGENT-PROTOCOL.md), con `policy_digest` actualizado. Un `DENY` o `REVIEW` no ejecutable hace fallar el comando en modo propuesta explícita; una operación read/local.check válida produce código 0. La salida incluye `release_authorized: false` en todos los casos.

La ejecución predeterminada de `npm run assurance:check` evalúa una propuesta `local.check` ficticia e inspecciona el código fuente. No altera secretos, WhatsApp ni archivos de clientes.

## Identidad y seguridad

El módulo actual **no autentica** al usuario que produce `StepProposal` ni verifica firmas de recibos de CI/Meta. El agente que llame a una herramienta real no puede delegar su autorización a este módulo. La capa de ejecución debe aplicar controles independientes antes de actuar. `ALLOW` no es una autorización humana ni un permiso de API.

El digest detecta que una propuesta fue creada con otra versión de la política, pero **no es una firma digital**. Un atacante que pueda modificar el repositorio o la política también puede cambiar el digest. Proteger ramas, revisiones y credenciales sigue siendo responsabilidad de GitHub y del propietario.

## Criterios del siguiente incremento

- Adaptador PRAXIOS de solo lectura con negociación de versión y autenticación, si el runtime autorizado está disponible.
- Recibos de pruebas ligados a SHA, CI y firma o fuente confiable; verificar procedencia antes de elevar el estado `TESTED`.
- Registro durable de `StepProposal`, `GateDecision` y `EvidenceReceipt` sin conversaciones ni PII.
- Revisión humana de ADR, amenazas y pruebas E2E Windows antes de habilitar operaciones reales.

## Referencias

- [AGENTS.md](../../AGENTS.md)
- [TDD](05-TDD.md)
- [Protocolo de agentes](07-AGENT-PROTOCOL.md)
- [Evidencia](08-EVIDENCE-AND-HANDOFF.md)
- [Roadmap](11-ROADMAP.md)

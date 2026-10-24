# Arranque local y sincronización Git — Windows / Codex
**Estado:** PROPOSED · Este documento no confirma que el repositorio esté clonado en el equipo.

## Bloqueo observado
Al consultar Local Projects — Windows Ale, el servicio informó: `Tunnel-client has not been seen for 300 seconds`. No se pudo inspeccionar la carpeta autorizada ni ejecutar comandos en Windows. No inferir inexistencia del clon: el túnel desconectado impide comprobarlo.

## Reanudar la conexión local
1. Ejecutar en Windows el cliente existente de Secure MCP Tunnel que autorizó Local Projects — Windows Ale.
2. Confirmar que está conectado y responde `list_projects`; no compartir runtime keys ni credenciales en chat.
3. Localizar si `conv-os` ya existe en los proyectos autorizados.
4. No cambiar ni borrar rutas autorizadas automáticamente. Si la carpeta de Conv OS queda fuera del alcance, pedir autorización explícita para agregarla.

## Si NO existe clon local
En PowerShell, dentro de una carpeta privada escogida por el propietario (no carpeta sincronizada públicamente):
```powershell
git --version
node --version
git clone --branch docs/praxios-meta-harness-foundation https://github.com/deepanalytica/conv-os.git
cd conv-os
git status --short --branch
npm run check
npm run setup:local
npm start
```
La rama documental incluye el código de `feat/acquisition-os` porque fue creada desde ella. Cuando se revise/fusione PR documental, actualizar a la rama de trabajo designada por el responsable técnico.

## Si ya existe clon
```powershell
cd <RUTA_DEL_CLON>
git status --short --branch
git remote -v
git fetch origin
git branch --all
```
Si hay modificaciones locales, preservar primero con un commit en rama propia o copia de seguridad; **no** usar `reset --hard`, `clean -fd`, `checkout -f` ni sobrescribirlas sin revisión. Si limpio, cambiar explícitamente a la rama documental con `git switch --track origin/docs/praxios-meta-harness-foundation` (o `git switch docs/praxios-meta-harness-foundation` si ya existe).

## Antes de datos reales
Confirmar BitLocker/Device Encryption y backup; Windows E2E y seguridad siguen pendientes. Instalar no equivale a habilitar Meta. No abrir túneles directos hacia localhost:4173 ni activar mensajes reales.

## Ciclo de cambio por agente
```text
git status → lectura AGENTS/foundation/status →
tarea pequeña → código+test → npm run check →
commit en rama → PR → evidencia/gates →
revisión humana → merge controlado
```
El programa se ejecuta localmente. GitHub se usa para código y verificaciones; nunca subir SQLite, credenciales ni mensajes privados.

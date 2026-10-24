# Conv OS - Arranque restringido a localhost.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
if (-not (Test-Path (Join-Path $root '.local/admin-auth.json'))) {
  throw 'Cuenta no configurada. Ejecuta: npm run setup:local'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'No se encontró Node.js. Instala Node.js 22.13 o superior.'
}
$env:HOST = '127.0.0.1'
$env:ENABLE_META_WEBHOOKS = 'false'
$env:DEMO_MODE = 'true'
Write-Host 'Conv OS local: http://127.0.0.1:4173' -ForegroundColor Cyan
node --experimental-sqlite src/server.js

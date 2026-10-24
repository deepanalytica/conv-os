@echo off
setlocal
cd /d "%~dp0"
if not exist ".\node.exe" (
  echo Falta node.exe en este paquete.
  pause
  exit /b 1
)
".\node.exe" --experimental-sqlite ".\scripts\backup-local.mjs"
pause
endlocal

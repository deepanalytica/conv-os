@echo off
setlocal
cd /d "%~dp0"
set "HOST=127.0.0.1"
set "ENABLE_META_WEBHOOKS=false"
set "DEMO_MODE=true"
if not exist ".local\admin-auth.json" (
  echo.
  echo Conv OS - Primera configuracion privada
  echo Crea una contrasena larga y unica. NO se publica ni se envia a GitHub.
  ".\node.exe" ".\scripts\setup-local.mjs"
  if errorlevel 1 (
    echo Error al configurar la cuenta. Revisa la guia de Windows.
    pause
    exit /b 1
  )
)
echo.
echo Conv OS se abrira localmente en http://127.0.0.1:4173
echo No cierres esta ventana mientras estes usando el sistema.
start "" "http://127.0.0.1:4173"
".\node.exe" --experimental-sqlite ".\src\server.js"
echo.
echo Conv OS finalizado.
pause
endlocal

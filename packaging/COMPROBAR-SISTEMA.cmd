@echo off
setlocal
cd /d "%~dp0"
".\node.exe" --check ".\src\server.js"
if errorlevel 1 (
  echo Error de sintaxis.
  pause
  exit /b 1
)
".\node.exe" --experimental-sqlite --test
pause
endlocal

# Instalación OPCIONAL: inicia el servidor cuando abre sesión el usuario actual.
# No abre puertos ni desactiva autenticación; puede necesitar permisos de Programador de tareas.
$ErrorActionPreference = 'Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path (Join-Path $root '.local/admin-auth.json'))) {
  throw 'Configura antes el acceso: npm run setup:local'
}
$node=(Get-Command node -ErrorAction Stop).Source
$user=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$name='ConvOS Local'
$action=New-ScheduledTaskAction -Execute $node -Argument '--experimental-sqlite src/server.js' -WorkingDirectory $root
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $user
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Tarea $name instalada para $user. No se ha abierto ningún puerto ni túnel." -ForegroundColor Green
Write-Host "Para revertir: Unregister-ScheduledTask -TaskName '$name' -Confirm:\$false"

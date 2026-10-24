# Conv OS / Acquisition OS — Operación privada en Windows

**Versión:** incremento de seguridad local y seguimiento comercial; rama `feat/acquisition-os`.

**Límite esencial:** el proyecto sigue siendo un MVP de laboratorio. No hay cuentas reales de Meta conectadas, no hay envío automático de mensajes, no se reciben comunicaciones fuera del equipo y **el archivo SQLite principal no está cifrado por la aplicación**. Se recomienda cifrar el disco con BitLocker. Un equipo comprometido por malware o un usuario con acceso al disco puede leer información no cifrada.

## 1. Preparar el equipo

- Windows 10/11 actualizado, Git y Node.js **22.13 o superior**.
- Protección antimalware activa, cuenta individual de Windows y bloqueo automático de sesión.
- **BitLocker/cifrado de dispositivo activo** antes de incorporar información confidencial; guardar la clave de recuperación en ubicación segura.
- No usar escritorio compartido, Wi-Fi público sin medidas adecuadas ni sincronizar la carpeta `data/` o `.local/` con repositorios, Drive público o carpetas compartidas.

## 2. Instalar sin tocar la versión pública

En PowerShell:

```powershell
git clone --branch feat/acquisition-os https://github.com/deepanalytica/conv-os.git
cd conv-os
npm run check
npm run setup:local
npm start
```

Si ya existe la carpeta `conv-os`, entra a ella y selecciona la rama (`git fetch origin`, `git switch feat/acquisition-os`) sin sobrescribir cambios locales.

`npm run setup:local` pide dos veces la contraseña sin mostrarla y crea `.local/admin-auth.json`, excluido de Git. Utiliza una contraseña larga y única, guardada en un gestor seguro.

Después abre **http://127.0.0.1:4173** (solo desde ese computador). La sesión se pierde al reiniciar el servidor o al caducar. En caso de olvidar la contraseña no existe recuperación automática; restablecer el archivo local exige acceso a la máquina y un procedimiento manual seguro. No envíes contraseñas, códigos 2FA ni tokens por el chat.

## 3. Ejecutar y detener

- Iniciar: `npm start` o `powershell -File .\scripts\start-local.ps1`.
- Detener: `Ctrl+C` en PowerShell.
- Inicio al abrir sesión de Windows, **solo si el propietario lo decide**: desde PowerShell ejecutar `.\scripts\install-autostart.ps1`. El sistema iniciará el servidor local, pero exigirá autenticación en la interfaz. No abre puertos ni crea túneles.
- Para eliminar el inicio automático: `Unregister-ScheduledTask -TaskName 'ConvOS Local' -Confirm:$false`.

Si falla una política de ejecución de PowerShell, utiliza directamente `npm start`; no es necesario deshabilitar protecciones del sistema.

## 4. Datos, empresas y seguimientos

Selecciona WAL o Visual Art AI en el selector de empresa y entra a **Adquisición CRM**. Puedes gestionar contactos de **prueba**, oportunidades y tareas de seguimiento. Los campos de moneda que muestra la UI son **estimaciones**, no ingresos comprobados ni pagos.

El servidor local solo escucha en `127.0.0.1`. Las solicitudes que provienen de direcciones remotas, hosts distintos o orígenes no permitidos se rechazan. No publiques el puerto 4173 mediante NAT, reverse proxy ni Cloudflare Tunnel. `ENABLE_META_WEBHOOKS` se mantiene en `false` en el arranque recomendado.

## 5. Respaldo cifrado (manual)

Con la base de datos ya creada:

```powershell
npm run backup:local
```

Se solicitará una frase distinta de la contraseña de inicio. Guarda esa frase en un gestor seguro. Se genera un archivo `backups/*.convbak`, protegido con AES-256-GCM y clave derivada mediante scrypt. La copia temporal SQLite sin cifrar se elimina al finalizar el proceso, pero por eso **es importante el cifrado del disco**.

Para probar recuperación:

```powershell
npm run restore:local -- "backups\nombre-del-respaldo.convbak"
```

Crea un archivo **nuevo** `data/restored-*.sqlite`, valida el formato y `PRAGMA integrity_check`. No sustituye automáticamente el archivo original. Antes de cualquier restauración real, cierra Conv OS, haz otra copia y verifica la integridad.

**Disponibilidad:** un respaldo guardado en el mismo disco no protege de su pérdida. Almacena copias cifradas también fuera del equipo, con controles de acceso. La versión actual no programa respaldos desatendidos porque no debe guardar una frase de cifrado reutilizable sin un almacén de secretos apropiado.

## 6. Reglas de privacidad y comportamiento autónomo

- No importar chats personales ni bases de clientes reales en este MVP.
- No enviar mensajes comerciales no solicitados ni automatizar respuestas sin validación del consentimiento.
- No usar capturas o textos para marcar pagos verificados.
- No confiar en prompts/IA como mecanismo de autenticación o aprobación financiera.
- Los seguimientos son tareas locales, **no** mensajes salientes. El propietario decide cuándo contactar.
- Registrar origen y consentimiento antes de operar campañas; no mezclar identidades entre empresas sin evidencia.

## 7. Para conectar Meta de forma segura en la siguiente etapa

El panel local no puede recibir directamente webhooks públicos mientras está aislado. La arquitectura prevista es **Meta → receptor mínimo HTTPS en Cloudflare Workers (firma HMAC) → cola segura / eventos acotados → agente local que los consulta con autorización**, evitando publicar el panel. Antes deben completarse las cuentas de prueba, gestión de claves y permisos, separación por identificador de canal, colas con retención limitada y controles de borrado/consentimiento.

Para WhatsApp Business con tu número actual debe verificarse elegibilidad para coexistencia, realizar el proceso oficial de autorización y comprobar eventuales limitaciones. **No registrar ni migrar el número existente antes de esta confirmación.**

## 8. Pendientes críticos antes de operación con clientes

- Auditoría de seguridad independiente y pruebas de extremo a extremo en Windows.
- Cifrado del volumen que contiene SQLite y gestión de copias externas.
- Revocación/rotación de credenciales, logs sin PII y políticas de retención/borrado.
- OIDC/RBAC por persona si se suman operadores (la versión local soporta solo un propietario).
- Integración oficial de Meta con OAuth, scopes mínimos, pruebas de suscripción y expiración.
- Sistemas externos de pago solo con verificación de proveedor, nunca confirmados por el modelo.
- Revisión legal de tratamiento de datos en Chile.

No se debe llamar «producción segura» a una versión solo porque GitHub Actions pase.

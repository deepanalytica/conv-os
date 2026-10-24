# Conv OS Windows · distribución portátil y comercialización (laboratorio)
**Estado:** código en rama `feat/windows-distribution-acquisition`. No hay release público con clientes reales.

## Qué se construye

Un paquete ZIP autocontenido para Windows 10/11 x64. GitHub Actions ejecuta `npm run check` sobre el runner Windows, copia `node.exe` del runtime Node.js 22.13 instalado oficialmente por `actions/setup-node`, añade código, vistas, tests y scripts, y comprime todo en `ConvOS-Windows-Portable.zip`.

**No es un binario nativo compilado ni un instalador firmado.** Es una distribución portátil de una aplicación Node.js local. No requiere instalar Node o npm por separado para arrancar. Un ZIP descargado no trae bases de datos personales, cuentas ni tokens; nunca distribuye `.local/`, `data/` o `backups/`.

La compilación se descarga entrando al workflow **Windows portable package** en GitHub Actions, abriendo su ejecución exitosa más reciente para `feat/windows-distribution-acquisition` y eligiendo el artefacto `ConvOS-Windows-Portable`. GitHub puede exigir iniciar sesión.

## Procedimiento Windows del usuario

1. Extraer el ZIP completo en una carpeta privada fuera de OneDrive/Dropbox compartidos.
2. Activar cifrado del dispositivo/BitLocker, Windows Defender, usuario individual y bloqueo automático.
3. Abrir `INICIO-CONV-OS.cmd` desde la carpeta extraída, crear contraseña del propietario y abrir http://127.0.0.1:4173.
4. Usar únicamente los datos ficticios de laboratorio. Cambiar empresa WAL / Visual Art AI desde el selector.
5. Crear contacto → oportunidad → seguimiento → presupuesto → registrar costos directos → documentar preferencias sin habilitar envíos. **`draft` y `won` no son pagos.**
6. Crear respaldo con `RESPALDO-CIFRADO.cmd`, guardar la frase de cifrado por separado y probar recuperación antes de actualizar versiones.
7. Al reemplazar archivos de una versión futura, conservar datos y credenciales locales, **no sobrescribir la carpeta `data/` ni `.local/`**. Respaldar antes de migrar.

## Módulo de estimación comercial

- Las ofertas precargadas tienen precios **de demostración** y costos directos nulos.
- La UI permite editar importes unitarios CLP por empresa, sin cambiar facturación ni cobros.
- Cada nueva cotización fija una instantánea de precio y costo vigente para impedir reescribir el pasado al editar una oferta.
- Si no hay costo registrado, margen directo = `SIN DATOS`. Si hay costo, se calcula `precio × unidades − costo directo × unidades`. Puede ser negativo y debe mostrarse.
- La interfaz etiqueta cobros, CAC y utilidad neta `SIN DATOS` siempre, porque faltan comprobantes de pagos y gasto publicitario de plataforma.
- Las ofertas y la base de oportunidades tienen `tenant_id`, consultas parametrizadas y pruebas de acceso cruzado.

## Arquitectura de despliegue

```
Compilación GitHub Actions (Windows, datos ficticios) ─► ZIP portátil
                     │
                     ▼
Windows del propietario: 127.0.0.1:4173 (sin DNS ni túnel)
                     │
                     ├── login local, sesión HttpOnly, CSRF
                     ├── CRM: WAL + Visual Art AI
                     ├── cotizaciones e indicadores estimados
                     ├── SQLite local
                     ├── copia cifrada manual .convbak
                     └── PRAXIOS/Meta-Harness: policy evaluator offline
```

No hay receptor HTTPS de Meta publicado. Nunca conectar el número WhatsApp Business actual por el método clásico de registro sin comprobar coexistencia y límites oficiales.

## Verificaciones ejecutadas

- GitHub Actions Windows ejecuta `npm run check`.
- El artefacto autoejecuta pruebas con el `node.exe` copiado.
- El ZIP no debe contener `data/`, `.local/`, `backups/`, tokens o conversaciones.
- Código, esquemas y CI permanecen bajo PR de borrador.
- **Pendiente:** prueba E2E de interacción visual en PC del propietario, política real de retención y borrado, seguridad independiente, aprobación de documentación y conexión OAuth/Meta. Ningún test garantiza seguridad absoluta.

## Gate de lanzamiento

`RELEASE_BLOCKED` hasta que haya cumplimiento de los criterios del [TDD](05-TDD.md), autorización humana, gestión de protección de datos, evaluación en Windows del propietario y verificación de proveedores. Los tests Windows del runner no acreditan validación sobre el equipo del usuario.

## Handoff a Codex / PRAXIOS

Mantener incremental sobre esta rama, sin cambiar `main`. Cada entrega debe incluir ticket/FR, prueba negativa, artefacto firmado por CI (checksum SHA-256 del ZIP, no firma Authenticode), bloqueos y próximo paso. No declarar «rentable» sin costos reales, conversión comprobada y conciliación.

## Consentimiento en laboratorio
El nuevo libro de preferencias guarda declaraciones manuales por contacto y empresa. Un permiso marcado por el operador permanece `UNVERIFIED_CLAIM`; no se convierte en consentimiento oficial y el outbound sigue bloqueado. Las exclusiones `OPTED_OUT` permanecen en el historial. No hay OAuth ni autorización para campañas.

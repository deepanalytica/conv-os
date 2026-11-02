# Despliegue

## CI
`.github/workflows/ci.yml`: node 22.13, sintaxis, unit y API tests, verificación de archivos. Debe pasar antes de habilitar pilotos reales.

## Demostración en GitHub Pages
`.github/workflows/pages.yml` publica la carpeta `public` sin backend. Activar en GitHub > Settings > Pages > Source: GitHub Actions. Después de ejecutar el workflow, la URL prevista es `https://deepanalytica.github.io/conv-os/`; **no asumir que está activa sin comprobarla**. Los datos de la demo residen en el navegador y son ficticios.

## API local
Node 22.13+, `npm run check`, `npm start`, abrir `http://127.0.0.1:4173`. En la rama feat/acquisition-os se exige configurar una contraseña con `npm run setup:local`; las APIs usan sesiones y CSRF, y el servidor solo permite loopback. El token compartido antiguo ya no funciona. Ver `docs/LOCAL-WINDOWS.md`. Nunca expongas el servidor a Internet.

## Producción posterior
El proyecto NO está listo para producción. Cloudflare Workers + D1 requerirá migrar `node:sqlite` a D1, identidad RBAC, rate limits, auditoría, acceso a Meta y pasarela real. No cargar secretos en variables de repositorio; usar GitHub Environments o Cloudflare Secrets.

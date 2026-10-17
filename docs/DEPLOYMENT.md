# Despliegue

## CI
`.github/workflows/ci.yml`: node 22.13, sintaxis, unit y API tests, verificación de archivos. Debe pasar antes de habilitar pilotos reales.

## Demostración en GitHub Pages
`.github/workflows/pages.yml` publica la carpeta `public` sin backend. Activar en GitHub > Settings > Pages > Source: GitHub Actions. Después de ejecutar el workflow, la URL prevista es `https://deepanalytica.github.io/conv-os/`; **no asumir que está activa sin comprobarla**. Los datos de la demo residen en el navegador y son ficticios.

## API local
Node 22.13+, `npm run check`, `npm start`, abrir `http://127.0.0.1:4173`. El token de demostración nunca debe usarse en una red pública.

## Producción posterior
El proyecto NO está listo para producción. Cloudflare Workers + D1 requerirá migrar `node:sqlite` a D1, identidad RBAC, rate limits, auditoría, acceso a Meta y pasarela real. No cargar secretos en variables de repositorio; usar GitHub Environments o Cloudflare Secrets.

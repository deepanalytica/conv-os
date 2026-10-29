# Deep Radar · Intelligence OS v0.1

Radar de oportunidades comerciales para dropshipping en Chile. **Implementación original (clean-room)** basada en funcionalidades públicas observables de herramientas de investigación de mercado, no en el código, servicios, algoritmos privados o datos de Dropkiller.

## Funciona hoy

- Dashboard oscuro responsive, radar de productos, ficha de oportunidad, investigación de anuncios Meta, investigación de tiendas, laboratorio de oferta y configuración.
- Producto, precio objetivo, costo Dropi, flete, comisión, CPA, provisión tributaria opcional, riesgo de rechazos, saldo por pedido y CPA máximo teórico.
- Puntuación explicable: margen (30), señales de demanda (25), especificidad del problema (15), competencia (15), logística (15); ponderada a la baja por ausencia de evidencia.
- CRUD, estado de validación, notas y URL de fuente; guardado local, importación CSV/JSON, exportación CSV/JSON.
- Accesos de investigación Meta Ads Library (Chile), búsquedas de competencia y Dropi, **sin scraping ni acceso no autorizado**.
- Datos iniciales expresamente **DEMO / no verificados**, no números atribuidos a ventas reales.
- Sin mensualidad ni integración que exija credenciales.

## Abrir

La carpeta `public/radar/` puede servirse como web estática. Iniciar un servidor local desde la raíz de este paquete:

```bash
python -m http.server 8787 -d public
```

Abrir `http://localhost:8787/radar/`. Por restricciones de CORS en módulos JavaScript, no abrir index.html vía `file://`. En el repositorio `conv-os`, copiar estos archivos a `public/radar/`; para publicación en GitHub Pages usar `/conv-os/radar/` cuando el pipeline de publicación incluya la carpeta.

## Test

```bash
node --test tests/core.test.mjs
```

## Fuentes y límites

- [Dropkiller — funciones/planes](https://app.dropkiller.com/pricing)
- [Dropkiller — términos](https://www.dropkiller.com/terms-and-conditions) (prohíben ingeniería inversa de sus Servicios y extracción masiva no autorizada).
- [Meta — alcance API Ad Library](https://www.facebook.com/ads/library/api/)
- [Meta Ads Library](https://www.facebook.com/ads/library/)
- [Dropi Chile](https://dropi.co/cl)

Se estudian **capacidades**, no código privado ni algoritmos propietarios. El radar no tiene sesión Dropi conectada, no captura anuncios automáticamente, no estima ventas de competidores, no ofrece ROAS inferido como hecho y no representa un negocio rentable de forma garantizada. El score es una heurística de priorización, no una probabilidad ni una medida certificada.

## Limitaciones conocidas

Datos en `localStorage` del navegador (sin sincronización), sin identidad multiusuario, sin backend; no es fuente financiera auditada. El flete y los costos pueden variar por destino, método de pago, IVA y proveedor. La reserva tributaria es configurable y 0 en los ejemplos; por tanto el saldo inicial **no es utilidad neta**. Rechazos se modelan como pérdida esperada simple y no incluyen necesariamente todos los impactos sobre caja. Exportar respaldos periódicos.

## Próxima versión después de ventas verificadas

1. Conexión a exportaciones reales autorizadas de Dropi y flujo de validación de stock.
2. Registro de observaciones históricas con fecha, evidencia y trazabilidad de margen por pedido entregado.
3. Backend privado (Cloudflare Workers+D1), autenticación e integraciones oficiales donde existan permisos.
4. Alertas programadas solo sobre fuentes permitidas, con políticas de tasa y retención.

No configurar tareas de scraping masivo de Dropkiller/Dropi ni eludir límites técnicos. Evitar guardar credenciales o tokens en el repositorio o en frontend.
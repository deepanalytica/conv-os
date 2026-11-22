# Deep Radar · Market Intel v0.2 — Benchmark funcional de Dropdata (2026-11-22)

## Hallazgo público verificable
Dropdata ofrece listas de demanda sostenida, rankings, tendencias, nuevos ganadores, aceleración, historial diario de stock y ventas **medidas indirectamente con algoritmos propios**, proveedores, calculadora, Meta Ads Spy, TikTok Spy y MCP de solo lectura. Sus datos **no son pedidos confirmados por Dropi** según su propia declaración.

Referencias:
- https://www.dropdata.app/como-funciona
- https://www.dropdata.app/caracteristicas
- https://www.dropdata.app/estadisticas-dropi
- https://www.dropdata.app/conectar/chatgpt
- https://droptrend.app/legal/terminos (otra empresa que explica el riesgo de equiparar disminución de stock con ventas)

No accedimos ni intentamos extraer código privado, endpoints ocultos, datos restringidos, claves o paneles de usuarios de Dropdata. El método de inferencia original de Dropdata es propietario y **no es posible afirmar que lo reproducimos exactamente**. Esta versión implementa observaciones independientes y transparentes.

## Añadido al repositorio
- \`public/radar/mercado/index.html\`: vista responsive vinculada al radar y a Radar Ganador Deep.
- \`engine.js\`: parser estricto CSV, historial normalizado por producto/proveedor, detección de faltantes, reposición, anomalías, descensos y peak de un día, score con penalización de cobertura/procedencia; sin ventas afirmadas.
- \`app.js\`: importación, exportación, ejemplo DEMO inequívoco, ficha, minigráfico, URL fuente declarada, acceso a búsqueda manual en Meta Ad Library.
- \`tests/radar-market.test.js\`: pruebas deterministas de seguridad de importación, cálculo y límites de evidencia.

## Esquema CSV aceptado
\`\`\`csv
date,product_id,supplier_id,stock,name,source_url
2026-11-20,SKU-01,PROV-01,150,Cepillo de limpieza,https://ejemplo.cl/catalogo
2026-11-21,SKU-01,PROV-01,145,Cepillo de limpieza,https://ejemplo.cl/catalogo
\`\`\`
También se aceptan equivalentes españoles \`fecha,id_producto,proveedor,existencias,nombre,fuente\` y separador punto y coma. **Los ejemplos de esta guía son inventados**. Nunca mezclar DEMO con datos reales.

Un registro = fotografía del inventario de un producto por proveedor y día. Solo importar exportaciones propias autorizadas o registros tomados manualmente con permiso, sin eludir límites o términos. No incorporar nombres, teléfonos, direcciones, cookies ni otros datos personales.

## Metodología transparente
1. Normalizar por (product_id, supplier_id) y fecha; rechazar fechas futuras, stock negativo, filas duplicadas y URL con protocolo no permitido.
2. Solo comparar observaciones de **días consecutivos**. Las lagunas no se interpolan.
3. Si stock sube, marcar reposición; no declarar venta.
4. Caídas de 80% o más del stock anterior, cuando este es al menos 20, se marcan como anomalías y no aportan unidades al cálculo.
5. Caídas restantes = **descenso observado de inventario, no ventas**.
6. Calcular descenso 7/14 días, días con descenso, pico diario, variación intersemanal y cobertura de hasta 14 pares diarios.
7. Señal que concentra >=60% de descensos en un día (y al menos 20 unidades en 14 días) se marca «Pico aislado», con score máximo 49.
8. Sin al menos 7 pares diarios comparables, estado «Muestra insuficiente». Sin URL de procedencia declarada, confianza penalizada. La URL no es automáticamente validada.
9. Puntuación exploratoria de 0–100: volumen logarítmico (25%), continuidad (30%), variación intersemanal (25%), dispersión temporal (20%), multiplicado por cobertura y penalización de ausencia de procedencia. **No es probabilidad ni certificación de demanda.**
10. Ninguna señal certifica «producto ganador». Para pilotear se requieren además: costes confirmados, condiciones y documentación de proveedor, cumplimiento del producto, creativos autorizados, pruebas reales COD y revisión humana.

## Economía COD (coste de publicidad por pedido captado)
- \`r\` = tasa de pedidos captados efectivamente entregados (entre 0 y 1); introducir tasa real cuando exista.
- \`B\` = precio - costo proveedor - despacho entregado - otros cargos entregados - reserva impuestos/otros.
- \`C\` = costo de anuncios por **pedido captado**.
- \`R\` = pérdida por pedido no entregado.
- **Resultado esperado por pedido captado:** \`r × B - (1-r) × R - C\`.
- **Contribución esperada por entrega:** \`B - ((1-r) × R + C) / r\`.
- **CPA máximo por pedido captado para meta T por entrega:** \`r × (B - T) - (1-r) × R\`.
- Incluye escenarios de sensibilidad para r = 60%, 70%, 80% y 90%.

Si el CPA máximo es negativo, no hay viabilidad para esa meta ni siquiera con publicidad gratis en este modelo. La reserva de impuestos se rellena manualmente y arranca en 0; no es utilidad neta auditada.

## Límites operativos
- No hay acceso auténtico a productos o inventario de Dropi ni API autorizada en este módulo; no hace peticiones a esas plataformas, y no descarga datos públicos automáticamente.
- Persistencia localStorage (un único navegador); exportar antes de limpiar. La importación reemplaza registros con confirmación explícita.
- No hay conexiones contables, pedidos, Meta Ads, atribución, facturación, pagos, credenciales ni tareas programadas.
- La fecha y precio declarados en el origen requieren validación externa, y una bajada de stock puede ser corrección, traslado, retirada u otra causa.
- El módulo no modifica ni publica productos, campañas, gasto, Shopify ni Dropi.

## Operación recomendada para Fortia
Una vez al día: registrar o importar inventario autorizado de 10–20 candidatos; comparar 7/14 días; revisar las anomalías; inspeccionar la biblioteca Meta (la duración de un anuncio **no es prueba de ventas**); obtener tarifa real COD por región; evaluar contribución objetivo de CLP 10.000 por pedido entregado; abrir la ficha Radar Ganador de 10 señales para controles de seguridad y proveedores; autorizar personalmente cualquier experimento con presupuesto.

Para obtener datos agregados de mercado de Dropdata sin reconstruir todo un catálogo, Dropdata publica un MCP OAuth de solo lectura (\`https://www.dropdata.app/api/mcp\`). Conectarlo depende de plan y autorización del titular; **no está conectado a este módulo**. Para nuestra estrategia de bajo presupuesto puede tener más sentido usar acceso legítimo de solo lectura a esas señales que construir scraping masivo.

## Pruebas
\`\`\`bash
node --test tests/radar-market.test.js
npm test
\`\`\`

## Estado de despliegue
El módulo está preparado para la ruta \`/conv-os/radar/mercado/\` del despliegue de GitHub Pages (el pipeline publica \`public/radar/\` de la rama main). La publicación depende de integrar esta rama y completar GitHub Actions; mientras esté en una rama/PR no es producción.

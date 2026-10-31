# Radar Ganador Deep — Módulo de evaluación manual (v1)
Ruta en GitHub Pages tras aprobar e integrar el PR: `/conv-os/radar/ganador/`.

## Qué hace
- Comparte los productos del radar independiente mediante la llave `deep-radar-v1` de `localStorage` **en el mismo navegador y dominio**.
- Guarda las diez señales y los controles por producto bajo `deep-radar-ganador-v1`, sin modificar el score previo de Deep Radar.
- Mide tres grupos: demanda (37%), marketing (25%) y operación (38%).
- Recibe puntuación manual de 0 a 5, URL de prueba, nota, fuente y fecha en cada señal.
- Distingue potencial, documentación y score conservador ajustado.
- Calcula contribución por pedido entregado, CPA de equilibrio, CPA para objetivo y sensibilidad ± CPA.
- Bloquea aprobación si precio/costo faltan, saldo no alcanza meta, evidencia es limitada o hay riesgo regulatorio, de seguridad o de proveedor pendiente.
- Permite registrar productos, editar costos y exportar ficha JSON con evidencias y resultado.
- Incluye un botón para **crear explícitamente** un ejemplo de aceite de batana con precio y costo de la captura, pero supuestos ilustrativos para el resto de los valores. No lo marca como producto validado.

## Pesos: 100 puntos
| Señal | Peso |
|---|---:|
| Dolor que duele | 15 |
| Problema masivo en Chile | 12 |
| Demanda validada afuera | 10 |
| Más de un ángulo | 8 |
| Diversidad creativa | 8 |
| Demostrable en 3 segundos | 9 |
| Margen que aguanta rechazos | 16 |
| Logística amigable | 8 |
| No lo encuentras en la esquina | 6 |
| Ticket alto o recompra | 8 |

Cada señal aporta `peso × nota/5`. La cobertura documental de cada señal es 0% sin documento, 40% con URL o nota, 80% con URL y nota, 100% con URL, nota suficientemente descriptiva y fecha. **Esto solo registra documentación aportada, no la verifica**. El score ajustado es `potencial × (0.55 + 0.45 × cobertura ponderada)`.

## Filtro conservador
El dictamen `Apto para piloto` requiere precio y costo > 0, contribución sobre el objetivo, score ajustado ≥75, cobertura ≥70% y controles manuales **regulatorio, seguridad y proveedor** marcados conformes. `Apto para piloto` **no** significa producto ganador ni ventas demostradas.

El saldo por pedido es `precio - proveedor - despacho - pasarela - reserva tributaria - (tasa rechazos × costo rechazo) - CPA`. CPA se expresa por **venta entregada**. Esta simplificación no calcula IVA real, ROAS observado ni flujo de caja por pedidos devueltos. Si los costos son desconocidos no se deben introducir ceros como si fueran gratuitos.

## Procedimiento de uso
1. Abre el radar principal y registra/importa candidatos; después entra al módulo Ganador desde el menú (o crea uno directamente allí).
2. Introduce costos reales y registra fuentes con sus fechas, indicando limitaciones.
3. Evalúa 0–5 cada señal, verifica cumplimiento sanitario/legal y riesgos del proveedor.
4. Examina dictamen, contribución y CPA límite; exporta JSON.
5. Haz un piloto de captación orgánica y verifica pedidos entregados antes de gastar de manera significativa.

## Límites conocidos
- No usa API ni scraping privado de Dropi, Dropkiller o Meta, ni promete detección automática de ventas.
- Sin backend, sin login, sin sincronización entre dispositivos. Los datos dependen del navegador, dominio y backups exportados.
- La existencia de una URL no certifica la veracidad de su contenido. Se requiere revisión humana.
- Los dictámenes son ayuda para priorizar; no recomendación financiera ni sanitaria.
- La exportación JSON es un respaldo de **la ficha evaluada**, no restaura automáticamente toda la base de datos.
- El sistema utiliza la misma clave de productos del radar general: cualquier cambio de costo aquí se reflejará allí.

## Tests
`npm test` corre `tests/radar-ganador.test.js` (además de las pruebas del repo). Ejecutar después de integrar.

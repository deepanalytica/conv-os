# Economía unitaria, atribución y experimentos comerciales
**Estado:** PROPOSED · Objetivo: rentabilidad demostrada, no métricas de vanidad.

## Modelo medible por organización y período
- Leads con consentimiento y fuente: cuenta/campaña/UTM solo cuando el proveedor los entrega o el usuario los declara explícitamente.
- Oportunidades calificadas: cumplen criterio de necesidad + ajuste a oferta + siguiente paso, sin equiparar «interesado» con «cliente».
- Ventas verificadas: pago recibido/verificado en WAL; contratos/ingresos devengados y cobros diferenciados en VAA.
- Costo de publicidad: gasto atribuido a campaña/período con fuente de plataforma; **no** confundir con presupuesto configurado.
- Costos variables WAL: prenda/tazón en blanco, tintas, desgaste, embalaje, comisiones, despacho subsidiado, merma, retrabajo y horas operativas.
- Costos variables VAA: horas de implementación, API, hosting, contratistas, suscripciones asignadas y soporte.
- Costos fijos y gastos administrativos separados, aunque la operación sea de una sola persona.

## Fórmulas, con advertencias
```text
lead_conversion = verified_customers / eligible_leads
CAC = eligible_acquisition_spend / new_verified_customers
AOV = verified_sales_revenue / verified_paid_orders
gross_margin = (revenue - direct_COGS) / revenue
contribution = revenue - variable_COGS - fees - fulfillment - attributable_acquisition_spend
contribution_margin = contribution / revenue
ROAS = attributed_verified_revenue / paid_media_spend
VAA project_margin = (contracted_revenue - attributable_delivery_cost) / contracted_revenue
```
No calcular división con denominador cero como 0%. Mostrar `NO_DATA`. Todos los números deben permitir navegar al asiento de origen y fecha. No mostrar «ganado» como `revenue` sin fuente financiera.

## Attribution
- `self_reported` para fuente declarada por cliente (incertidumbre explícita).
- `platform_reported` para reportes Meta (no implica causalidad absoluta).
- `first_touch` y `last_touch` solo si las interacciones realmente están vinculadas por identidad verificada.
- `unattributed` si falta evidencia; nunca repartir créditos inventados.
Los resultados comerciales deben permitir comparar contra grupo de control/período base cuando sea viable.

## Experimento WAL — prueba pequeña
Hipótesis: tres colecciones con dirección de arte, precio validado y compra guiada simplifican cierres. Registrar visitas, contactos, pedidos pagados, devoluciones, tiempo de personalización y contribución real. No activar campañas de gasto sin presupuesto fijado/aprobación del propietario. Medir también saturación de producción para no ganar demanda inviable.

## Experimento Visual Art AI — prospectos B2B
Hipótesis: un diagnóstico inicial de presencia digital con seguimiento humano genera propuestas calificadas. Registrar contactos consentidos, diagnósticos entregados, reuniones, propuestas, contratos, horas de delivery y cobro efectivo. Evitar promesas de aparecer en ChatGPT/Google sin evidencia y de tiempos garantizados.

## Política de decisión
Una campaña escala solo si muestra contribución positiva, integridad de datos suficiente y capacidad operativa, todo dentro de presupuesto autorizado. Si métricas faltan, estado `INCONCLUSIVE`; no aumentar gasto por recomendaciones de IA.

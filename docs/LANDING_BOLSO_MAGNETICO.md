# PISO/CERO — Landing mono-producto (vista previa)

**Objeto:** sitio estático para validar la venta en Chile de un bolso magnético de gimnasio. Marca conceptual «PISO/CERO» (sin revisión formal de marcas). No confundir con la marca de un fabricante real.

## Abrir

```bash
python -m http.server 8787 -d public
# http://localhost:8787/bolso-magnetico/
```

Archivos: `public/bolso-magnetico/index.html` y `public/bolso-magnetico/assets/producto-conceptual.svg`. Funciona en cualquier servidor estático; no necesita dependencias ni backend.

## Activar venta sin prometer cosas no verificadas

1. **SKU y fotografías reales:** verificar el producto de Dropi, color, material, peso, medidas, resistencia del imán y accesorios incluidos; reemplazar la ilustración `assets/producto-conceptual.svg` por fotografías propias o del proveedor con licencia explícita. No usar imágenes de competidores sin autorización. Actualizar textos y preguntas frecuentes de acuerdo con la ficha real.
2. **Precio y costo:** comprobar costo final, comisiones, IVA, flete por región, devoluciones, necesidad de fondos adelantados y margen. En `index.html`, editar `STORE.priceCLP`, `priceConfirmed` y `stockConfirmed` según evidencia real; cuando estén confirmados, sustituir las etiquetas «referencial» y la advertencia DEMO por términos comerciales correctos.
3. **WhatsApp:** en la constante `STORE`, ingresar `whatsappE164` con dígitos internacionales sin espacios, por ejemplo un número chileno con prefijo 56. Con número vacío, la consulta se puede copiar, pero deliberadamente **no se abre un chat sin destinatario**.
4. **Condiciones legales:** antes de captar pagos agregar identificación del vendedor, medios de contacto, condiciones de venta, política de despacho, cambios, devoluciones y tratamiento de datos. Aquí no existe pago ni envío de formularios: no se capturan datos del visitante.
5. **Publicación:** la página usa `<meta name="robots" content="noindex,nofollow">` por estar en vista previa. Retirarlo solo al tener todo verificado. El fondo ambiental puede cargar una fotografía de Unsplash con licencia; la imagen de producto es una ilustración conceptual hecha específicamente para este prototipo.

## Interacciones implementadas

- Menú móvil, selector de vistas conceptuales, cantidad entre 1 y 10, región de despacho.
- Cálculo de subtotal **referencial** y mensaje de WhatsApp contextual en el momento de consulta.
- Fallback para copiar la consulta cuando no existe número de WhatsApp.
- FAQ nativa accesible, diálogo con enfoque y navegación por teclado; responsive; soporte para `prefers-reduced-motion`.
- Sin analytics, cookies de seguimiento, pagos, checkout, CRM o fake social proof.

## QA sugerido

- Comprobar en móvil 390 px, tablet y desktop: `document.documentElement.scrollWidth <= window.innerWidth`.
- Abrir el diálogo, cambiar cantidad y región, copiar mensaje y comprobar subtotal.
- Configurar un número de prueba **de titularidad propia** y verificar que `wa.me` apunta al destinatario correcto sin credenciales expuestas.
- Verificar imágenes en móvil, enlaces, FAQ y navegación por teclado.
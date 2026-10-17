# Design System · Conversation Ops

## Principios
Operación primero, estética subordinada a comprensión. El personal debe identificar pagos, retrasos y próximos pasos sin interpretar colores ambiguos.

## Tokens provisionales
- Superficie principal: `#090f19`; superficie de tarjeta `#111c2b`.
- Acción primaria: `#65e3b2`.
- Alerta: `#f6b55a`. Error: `#ef7979`.
- Texto: `#f3f8fc`; secundario `#96a9bd`.
- Retícula base 4 px; objetivo táctil mínimo 44 px.
- Tipografía: DM Sans y Plus Jakarta Sans, con fuentes de sistema como fallback.

## Semántica
`status.awaiting_payment` es distinto de `status.paid` y `status.completed`. El texto y el color siempre se presentan juntos. La demo identifica pagos como ficticios.

## Componentes
Button, Input, Select, Card, StatusBadge, OrderRow, ActivityItem, TenantSelector y Dialog. Variantes visuales representadas en CSS. Se recomienda extraer los tokens a JSON/CSS variables y documentar Storybook cuando crezca la biblioteca.

## Accesibilidad
Foco visible, contraste, etiquetas de formulario, reducción de movimiento, mensajes de error legibles y pruebas reales con teclado y móvil.

## Librerías
React Bits y GSAP son candidatas para marketing o microinteracciones; no se incluyen como dependencia del MVP y nunca deben ralentizar cocina o reparto.


## Dirección v0.3 · WhatsApp-first
- **Contexto:** bandeja de conversaciones simuladas, chat y panel lateral de estados.
- **Colores:** carbón y verde conversacional; no pretende ser una aplicación oficial de Meta.
- **Tokens:** superficies oscuras, borde de bajo contraste, verde para acciones y estados positivos.
- **Producto y marketing:** `public/premium.css` gobierna la demo y `public/landing/landing.css` la landing; se recomienda unificar los tokens en la próxima versión de React.
- **Accesibilidad:** texto de estado, foco visible, layout móvil y respeto a preferencias de movimiento reducido.
- **Advertencias operacionales:** no inferir pagos bancarios de mensajes o comprobantes; la demo nunca envía mensajes reales.

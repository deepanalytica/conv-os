# Sistema visual Conversation Ops · v0.4

## Apariencia
- Tema oscuro predeterminado y modo claro seleccionable desde la cabecera.
- Preferencia conservada en el navegador con `localStorage`.
- La landing y la aplicación comparten `public/theme.css` y `public/theme.js`.

## Activos desplegados
- `public/assets/hub-dark.svg`: ilustración vectorial de bandeja, conversación, pedido, pago simulado y despacho.
- `public/assets/hub-light.svg`: variante clara del mismo centro operativo.
- `public/assets/flow-dark.svg` y `flow-light.svg`: el ciclo de nueve etapas.
- `public/assets/icons.svg`: símbolos semánticos para las acciones operativas.

Los SVG se renderizan con tipografía y estados legibles y se mantienen separados de la lógica transaccional. Los componentes reales son HTML/CSS/JavaScript: las ilustraciones no son una interfaz que se pueda pulsar.

## Operación completa
Conversación → calificación → pedido o servicio → cobro → verificación → ejecución o preparación → despacho o agenda → entrega → métricas.

No marcar un pago como aprobado por leer `ya pagué` ni por una captura de pantalla. La demostración pública no tiene confirmación bancaria ni rutas calculadas en vivo.

## Activos gráficos adicionales
Los ocho renders generados por IA y el tablero de dirección de arte fueron optimizados en un paquete WebP separado (Conversation Ops Media Kit v0.4). Son exploraciones comerciales y no capturas verificadas, ni tienen la precisión de un componente interactivo. Antes de utilizar cualquiera en publicidad, verificar las cifras, textos y atributos de marca.

## QA
CI incluye validación JavaScript, tests backend, comprobación de secretos y parseo de SVG. El despliegue en GitHub Pages publica los archivos de `public`. Se recomienda completar después pruebas visuales de regresión en Chromium para móvil y escritorio.
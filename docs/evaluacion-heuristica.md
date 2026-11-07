# Evaluación heurística — Cazador de Objetos

Evaluación de la app con las **10 heurísticas de usabilidad de Jakob Nielsen**, pantalla por pantalla.
Leyenda: ✅ cumple · ⚠️ cumple parcialmente (con la limitación señalada).

## Resumen por heurística

| # | Heurística | Cómo se cumple |
|---|---|---|
| H1 | Visibilidad del estado del sistema | Contador `3/8 ÁNGULOS`, anillo que se llena, pasos reales de procesamiento con % del 3D, píldora "3D en camino · 45%", skeletons de carga. |
| H2 | Coincidencia entre el sistema y el mundo real | Lenguaje de juego en español ("capturar", "rareza", "racha"); la metáfora del anillo = rodear físicamente el objeto. |
| H3 | Control y libertad del usuario | Cerrar escáner en cualquier momento, "Listo" desde 3 fotos, "Ver criatura ahora" sin esperar al 3D, confirmación antes de descartar o borrar. |
| H4 | Consistencia y estándares | Un sistema de tokens (colores, radios 12/20/28, espaciado ×8, botones de 52 pt), mismo set de íconos, mismos colores de rareza en toda la app. |
| H5 | Prevención de errores | "Listo" deshabilitado con < 3 fotos; alertas al salir sin guardar, eliminar o borrar datos; validación de imágenes en el backend. |
| H6 | Reconocer antes que recordar | Filtros como chips visibles con color; leyenda de rarezas; miniaturas de fotos tomadas; badges de tipo/rareza en cada tarjeta. |
| H7 | Flexibilidad y eficiencia | Captura automática por giroscopio **y** botón manual; botón de escaneo siempre a un toque en la tab bar; orden y búsqueda en la colección. |
| H8 | Diseño estético y minimalista | Fondo casi negro, un único acento lima, un solo efecto protagonista por pantalla, sin información decorativa. |
| H9 | Ayudar a reconocer, diagnosticar y recuperarse de errores | Errores en lenguaje humano con acción: "No logramos ver un objeto claro → Volver a escanear", "Sin conexión → Reintentar / Usar modo demo". |
| H10 | Ayuda y documentación | Onboarding de 3 pasos (repetible desde Perfil), guías contextuales en el escáner ("Rodea el objeto despacio", "Acércate", "Busca buena luz"). |

## Por pantalla

### 1. Onboarding
- **H2** Ilustraciones que representan la acción real (anillo de 8 segmentos, cartas por rareza).
- **H3** "Saltar" y "Ahora no" para el permiso de cámara.
- **H10** Explica *qué* es, *cómo* escanear y *qué* se colecciona; el permiso de cámara se justifica **antes** de pedirlo.
- **H1** Indicador de página (puntos) y "Paso N de 3" para lectores de pantalla.

### 2. Inicio
- **H1** Racha y progreso de colección (barra por rareza, tipos descubiertos 3/7).
- **H7** Botón protagonista "Escanear objeto" + botón central de la tab bar.
- **H8** Un solo efecto: anillos pulsantes alrededor del botón principal.
- **H9** Aviso si el servidor no está configurado ("los escaneos usarán el modo demo").
- Estado vacío con CTA "Escanear mi primer objeto".

### 3. Escáner 360°
- **H1** Anillo de 8 segmentos que se llena, marcador de orientación que sigue el giro, contador `N/8 ÁNGULOS`, destello + haptic por foto, miniaturas.
- **H2** Rodear el objeto en la realidad = llenar el anillo en pantalla.
- **H3** Cerrar (X) siempre visible; "Listo" a partir de 3 fotos.
- **H5** Si el giro es muy rápido no se dispara la captura y aparece "Rodea el objeto más despacio"; aviso de poca luz (EXIF en iOS).
- **H7** Si el giroscopio no está disponible, el modo cambia a captura manual con mensaje explícito.
- **H10** Guías rotativas: "Acércate", "Rodea el objeto despacio", "Busca buena luz".

### 4. Procesando
- **H1** Pasos reales: Analizando con IA → Reconstruyendo modelo 3D (con %) → Creando criatura; la nube de puntos se arma según el avance real.
- **H3** "Ver criatura ahora": el 3D sigue cargando en segundo plano.
- **H9** Errores accionables: Reintentar · Usar modo demo · Volver a escanear; mensaje específico si no se ve un objeto claro.

### 5. Resultado / Revelación
- **H1** Píldora de progreso del 3D mientras termina en segundo plano.
- **H4** El color del destello = color de la rareza en toda la app.
- **H5** Confirmación al salir o escanear otro sin guardar.
- **H6** Toggle 3D / 360° visible; la tarjeta muestra todo lo relevante (stats, habilidad, historia).
- Modo demo etiquetado claramente ("Modo demo · criatura de ejemplo").

### 6. Colección y detalle
- **H6** Chips de rareza y tipo con su color; búsqueda por nombre u objeto; orden (Recientes, Rareza, Poder, A–Z).
- **H9** "Sin resultados" con acción "Limpiar filtros".
- **H5** Eliminar requiere confirmación y explica que no se puede deshacer.
- Funciona sin conexión (datos y fotos en el teléfono).

### 7. Perfil
- **H1** Estadísticas por rareza y tipo, logros con barra de progreso.
- **H3/H5** "Borrar todos los datos" con confirmación destructiva.
- **H7** Ajustes: reducir animaciones, haptics on/off, añadir criaturas demo, repetir introducción.

## Accesibilidad (complemento)
- `accessibilityLabel`/`Role`/`State` en todos los controles; regiones `polite` para contador y guías.
- Contraste AA: texto #F5F3F0 y #9E9CA6 sobre #0A0A0C (≈ 18:1 y ≈ 7:1); lima sobre negro ≈ 16:1.
- Respeta el tamaño de texto del sistema (con tope para no romper el layout) y "Reducir movimiento" del sistema además del ajuste propio.
- Áreas táctiles ≥ 44 pt.

## Hallazgos pendientes (⚠️)
- El aviso de "poca luz" depende del EXIF `BrightnessValue`, disponible de forma fiable solo en iOS.
- El visor 3D (model-viewer) necesita conexión la primera vez para cargar su script; sin red se usa el visor 360° de fotos.

# Evaluación heurística — Cazador de Objetos

Evaluación de la app con las **10 heurísticas de usabilidad de Jakob Nielsen**, pantalla por pantalla.
Leyenda: ✅ cumple · ⚠️ cumple parcialmente (con la limitación señalada).

## Resumen por heurística

| # | Heurística | Cómo se cumple |
|---|---|---|
| H1 | Visibilidad del estado del sistema | Contador `3/8 ÁNGULOS`, anillo que se llena, pasos reales de procesamiento con % del 3D, píldora "3D en camino · 45%", skeletons de carga, indicador "N cambios pendientes de sincronizar" y estado de nube en Resultado, Detalle y Perfil. |
| H2 | Coincidencia entre el sistema y el mundo real | Lenguaje de juego en español ("capturar", "rareza", "racha"); la metáfora del anillo = rodear físicamente el objeto; íconos de nube / nube tachada para sincronizado / pendiente. |
| H3 | Control y libertad del usuario | Cerrar escáner en cualquier momento, "Listo" desde 3 fotos, "Ver criatura ahora" sin esperar al 3D, confirmación antes de descartar o borrar; "Probar sin cuenta" y "Ahora no" al subir la colección: registrarse nunca es obligatorio. |
| H4 | Consistencia y estándares | Un sistema de tokens (colores, radios 12/20/28, espaciado ×8, botones de 52 pt), mismo set de íconos, mismos colores de rareza en toda la app. |
| H5 | Prevención de errores | "Listo" deshabilitado con < 3 fotos; alertas al salir sin guardar, eliminar o borrar datos; validación de imágenes en el backend; validación en línea de usuario, correo y contraseña; usuario duplicado detectado antes de enviar; botón deshabilitado mientras carga (evita doble registro); aviso si cerrar sesión perdería cambios sin sincronizar. |
| H6 | Reconocer antes que recordar | Filtros como chips visibles con color; leyenda de rarezas; miniaturas de fotos tomadas; badges de tipo/rareza en cada tarjeta. |
| H7 | Flexibilidad y eficiencia | Captura automática por giroscopio **y** botón manual; botón de escaneo siempre a un toque en la tab bar; orden y búsqueda en la colección; sesión persistente (entra directo); pull-to-refresh; autocompletado de correo/contraseña del sistema y "siguiente" en el teclado. |
| H8 | Diseño estético y minimalista | Fondo casi negro, un único acento lima, un solo efecto protagonista por pantalla, sin información decorativa. |
| H9 | Ayudar a reconocer, diagnosticar y recuperarse de errores | Errores en lenguaje humano con acción: "No logramos ver un objeto claro → Volver a escanear", "Sin conexión → Reintentar / Usar modo demo"; errores de Supabase traducidos ("Correo o contraseña incorrectos", "Ya existe una cuenta con ese correo. Inicia sesión."); colección con error + "Reintentar". |
| H10 | Ayuda y documentación | Onboarding de 3 pasos (repetible desde Perfil), guías contextuales en el escáner ("Rodea el objeto despacio", "Acércate", "Busca buena luz"); pistas bajo cada campo ("Mínimo 8 caracteres"); "¿Olvidaste tu contraseña?". |

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
- Funciona sin conexión: la colección se lee de Supabase y se cachea en el teléfono.
- **H1** Skeleton en la primera carga, pull-to-refresh y aviso discreto de cambios pendientes (ícono de nube tachada en cada tarjeta sin subir).
- **H9** Sin red y sin caché: estado de error con "Reintentar". Con caché: banda "Sin conexión. Mostrando tu colección guardada en este teléfono".

### 7. Perfil
- **H1** Estadísticas por rareza y tipo, logros con barra de progreso.
- **H1** Usuario, total, conteo por rareza y "La más rara" leídos de la base de datos (skeleton mientras carga; si falla, datos locales con aviso y "Reintentar").
- **H3/H5** "Cerrar sesión" y "Borrar datos de este teléfono" con confirmación que explica qué se borra y qué queda en la nube.
- **H7** Ajustes: reducir animaciones, haptics on/off, añadir criaturas demo, repetir introducción.

### 8. Cuentas (bienvenida, registro, inicio de sesión, recuperación)
- **H3** Tres salidas claras en la bienvenida: "Crear cuenta", "Iniciar sesión" y "Probar sin cuenta". Botón Volver de 44 pt en cada formulario.
- **H5** Validación en línea al salir de cada campo (no mientras se escribe, para no regañar antes de tiempo); disponibilidad del usuario comprobada antes de crear la cuenta; contraseña mínima de 8 caracteres en la app y en el servidor.
- **H9** Mensajes de Supabase traducidos y accionables: "Correo o contraseña incorrectos.", "Ya existe una cuenta con ese correo. Inicia sesión.", "No hay conexión. Revisa tu internet e intenta de nuevo.", "Demasiados intentos. Espera un minuto…". El error de usuario duplicado aparece en el campo, no en un mensaje genérico.
- **H1** Indicador de carga dentro del botón y botón deshabilitado; banda de éxito o error con `accessibilityLiveRegion`; haptic de éxito o error.
- **H6** Etiquetas siempre visibles sobre el campo (no solo placeholder); ícono por campo; mostrar/ocultar contraseña.
- **H7** `textContentType`/`autoComplete` para el gestor de contraseñas; "siguiente" salta de campo; la sesión se guarda y la app entra directo.
- **Mobile**: `KeyboardAvoidingView` + scroll con `keyboardShouldPersistTaps`, safe areas y campos de 52 pt.

### 9. Sincronización y migración del invitado
- **H3** Al crear cuenta o entrar con criaturas de invitado, la app ofrece "Subir mi colección" (con conteo por rareza) o "Ahora no".
- **H1** Guardado optimista: la criatura aparece al instante; si no hay red queda "pendiente de sincronizar" y se sube sola al reconectar (NetInfo) o al volver a la app.
- **H5** Los borrados sin conexión también se ponen en cola; cerrar sesión avisa si hay cambios sin subir.
- **Privacidad**: fotos en un bucket privado por usuario (`scans/{uid}/…`), servidas con URLs firmadas; RLS en todas las tablas (verificado con `scripts/test-supabase.mjs`).

## Accesibilidad (complemento)
- `accessibilityLabel`/`Role`/`State` en todos los controles; regiones `polite` para contador y guías.
- Contraste AA: texto #F5F3F0 y #9E9CA6 sobre #0A0A0C (≈ 18:1 y ≈ 7:1); lima sobre negro ≈ 16:1.
- Respeta el tamaño de texto del sistema (con tope para no romper el layout) y "Reducir movimiento" del sistema además del ajuste propio.
- Áreas táctiles ≥ 44 pt (chips de 36 pt + `hitSlop` de 4).
- Campos de formulario con etiqueta asociada, pista y error anunciados por el lector de pantalla.

## Hallazgos pendientes (⚠️)
- El enlace de "¿Olvidaste tu contraseña?" abre la página de Supabase en el navegador; aún no hay una pantalla propia para escribir la nueva contraseña dentro de la app.
- Las URLs firmadas de fotos duran 7 días: sin conexión por más tiempo solo se ven las fotos que el teléfono ya tenía en caché.
- El aviso de "poca luz" depende del EXIF `BrightnessValue`, disponible de forma fiable solo en iOS.
- El visor 3D (model-viewer) necesita conexión la primera vez para cargar su script; sin red se usa el visor 360° de fotos.

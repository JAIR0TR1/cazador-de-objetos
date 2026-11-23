# QA: Cazador de Objetos 1.0.1

Estado al 23 de noviembre de 2026. Cada cifra sale de un comando ejecutado ese día en la rama `cierre-final`.

## 1. Verificación automática

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | sin errores |
| `npx expo lint` | sin errores ni advertencias |
| `npx expo-doctor` | 18/18 checks |
| `npx expo export -p android` | bundle Hermes de 5,11 MB generado |
| `npm run test:ci` | **120 pruebas en 10 suites, todas en verde** (3 corridas seguidas con el mismo resultado) |
| `node scripts/test-supabase.mjs` | **no se pudo ejecutar**: el dominio del proyecto Supabase no resuelve en DNS (ver sección 4) |

### Pruebas automáticas (jest-expo 54.0.18 + Testing Library 14.1.0)

Ninguna prueba sale a la red ni toca hardware: cámara, giroscopio, haptics, NetInfo, AsyncStorage, archivos y Supabase están simulados (`jest/setup.ts`, `jest/supabaseMock.ts`). Las fechas son fijas y los temporizadores son falsos, así que ningún resultado depende del azar ni del reloj.

| Suite | Pruebas | Qué cubre |
|---|---:|---|
| `logic/validation` | 16 | usuario, correo y contraseña (registro e inicio de sesión) |
| `logic/supabaseErrors` | 19 | traducción de errores de Supabase al español; sin red; errores desconocidos no filtran detalles internos |
| `logic/apiClient` | 10 | sin servidor, éxito, 5xx con reintento, 4xx sin reintento, 422/429, respuesta no JSON, sin red, timeout |
| `logic/analyzeBudget` | 3 | recorte de fotos al límite del servidor (nunca menos de 3) |
| `logic/collectionStore` | 14 | local/pending según el modo, idempotencia, cola de borrados, caché separada por usuario, estadísticas, racha |
| `logic/achievements` | 12 | logros y contraste AA de los colores de rareza (texto e insignias) |
| `logic/sync` | 13 | pending → synced, sin red, caída a mitad de subida y reintento, error de datos aislado, invitado, llamadas simultáneas, borrados pendientes, reconexión, refresco |
| `logic/authStore` | 10 | modos none/guest/user, invitado recordado, iniciar sesión, crear cuenta, sesión guardada sin red, cerrar sesión |
| `components/basics` | 11 | Button (cargando, deshabilitado, 2 líneas), TextField (error en línea, pista, ojo), EmptyState, Skeleton |
| `components/CollectionScreen` | 12 | carga, vacío, error con "Reintentar", pendientes, búsqueda, filtros, "Limpiar filtros", orden, abrir detalle |

Cobertura de la última corrida (`npm run test:ci`), por archivo de lógica, en líneas: `validation` 100 %, `errors` 100 %, `achievements` 100 %, `api/client` 100 %, `analyze` 90 %, `collectionStore` 87,9 %, `authStore` 86,8 %, `sync` 78,4 %; pantalla `collection.tsx` 100 %. El total del proyecto es 27,6 % porque las pantallas de cámara, escáner y visor 3D no se prueban en Jest (necesitan hardware).

## 2. Verificación visual (sin teléfono)

Build web exportado (`expo export -p web`, con `"web"` agregado solo de forma temporal) y recorrido con Playwright/Chromium, con "reducir movimiento" activado. Script: `scripts/capturas-web.js`.

- **34 capturas** en [docs/screenshots/](screenshots/): 17 pantallas a **390×844** y las mismas 17 a **360×640**.
- En cada captura el script revisa dos cosas: elementos que se salen del ancho de la ventana y controles con área táctil menor a 44 px. El resultado está en `auditoria-390x844.json` y `auditoria-360x640.json`.
- Resultado final: **0 elementos cortados en las 34 capturas**. Única marca restante: el `Switch` de Ajustes mide 40×20 en web, pero la fila completa (56 pt) es el control táctil con rol `switch`.
- Errores de JavaScript durante el recorrido: **ninguno**.

Pantallas capturadas: onboarding (paso 1 y 3), permiso de cámara, bienvenida, iniciar sesión (vacío, con errores y sin conexión), crear cuenta con errores, inicio vacío, colección vacía, perfil de invitado, inicio con criaturas demo, colección demo, filtro "Legendaria", perfil con criaturas, detalle de criatura (arriba y abajo).

### Defectos encontrados y corregidos en esta revisión

| Defecto | Dónde | Corrección |
|---|---|---|
| Texto blanco sobre la insignia "Épica": contraste 1,58:1 | `src/features/creatures/badges.tsx` | texto oscuro en todas las insignias (≥ 5:1) |
| Texto azul de "Rara" 4,08:1 sobre la superficie | `src/theme/tokens.ts` | color de texto `#6E98FF` (6,65:1) |
| Etiqueta de botón cortada a 1 línea con texto grande | `src/components/Button.tsx` | hasta 2 líneas |
| Escala del botón al presionar ignoraba "Reducir movimiento" | `src/components/Button.tsx` | sin animación si está activo |
| Resultado: la barra fija tapaba el final del contenido | `app/result.tsx` | el scroll reserva el alto medido de la barra |
| "Última captura" colapsada a 2 px (web) | `src/features/creatures/CreatureThumb.tsx` | flex explícito |
| Chips de 36 pt, enlaces del pie de 17 pt, switches de 40×20 | `Chip.tsx`, `FormScreen.tsx`, `profile.tsx` | 44 pt reales; fila completa como control |
| Perfil de invitado ofrecía cuentas aunque Supabase no estuviera configurado | `app/(tabs)/profile.tsx` | solo si está configurado |

### Qué NO se pudo verificar sin teléfono

- **Cámara y escáner 360°** (`expo-camera`): no hay cámara en el navegador de pruebas.
- **Giroscopio** (`DeviceMotion`): el anillo de 8 segmentos depende del giro real.
- **Haptics**: en web no vibran.
- **Teclado real** sobre los formularios (`KeyboardAvoidingView` en iOS y Android).
- **Modo avión** y re-sincronización con NetInfo real (en Jest está simulado).
- **Visor 3D en WebView**: en web se ve la "vista previa" (nube de puntos).
- **Pantalla de resultado** tras un escaneo real: necesita fotos de la cámara. La tarjeta de criatura sí se ve en el detalle.
- **Texto grande del sistema** y **TalkBack/VoiceOver**: los límites de escala y las etiquetas están en el código y en pruebas, pero falta escucharlos en un teléfono.
- **RLS y Storage en vivo**: ver la sección 4.

## 3. Pruebas manuales en teléfono (para hacer antes de presentar)

Marca cada casilla en iPhone (Expo Go) y en Android (APK).

- [ ] **Giroscopio:** en el escáner, al rodear el objeto se llena el anillo y suena/vibra en cada segmento nuevo.
- [ ] **Cámara:** primera vez pide permiso con la explicación; si se niega, el escáner explica cómo darlo.
- [ ] **Escaneo completo con red:** 3 a 8 fotos → Procesando → Resultado con rareza → Guardar → aparece en Colección.
- [ ] **Haptics:** revelación más intensa en Legendaria que en Común; el ajuste "Vibración" las apaga.
- [ ] **Teclado:** en Crear cuenta e Iniciar sesión, el campo activo y el botón quedan visibles con el teclado abierto (iPhone SE o pantalla pequeña si es posible).
- [ ] **Modo avión:** con sesión iniciada, escanear y guardar (falla el análisis y ofrece "Usar modo demo"); guardar la demo; borrar una criatura sincronizada. Colección muestra "cambios pendientes".
- [ ] **Re-sincronización:** quitar el modo avión; en segundos desaparece el aviso de pendientes y los cambios se ven en otro teléfono con la misma cuenta.
- [ ] **Cerrar y abrir sesión:** la colección vuelve desde la nube con sus fotos.
- [ ] **Otro usuario:** crear una cuenta nueva en el mismo teléfono; no debe ver nada de la primera.
- [ ] **Abrir la app sin red** con sesión guardada: entra y muestra la colección en caché.
- [ ] **Texto grande** (Ajustes del sistema al máximo): nada cortado en Bienvenida, Iniciar sesión, Colección, Resultado y Perfil.
- [ ] **Reducir movimiento** del sistema: sin pulsos en Inicio, sin destello en Resultado.
- [ ] **TalkBack (Android) / VoiceOver (iPhone):** se anuncian los botones, los errores de formulario, las pestañas y los interruptores de Ajustes con su estado.
- [ ] **Visor 3D:** en el detalle de una criatura demo gira el modelo; en una real se ve la vista 360° de fotos.

## 4. Seguridad y backend

- `.env`, `.env.local`, `server/.env.local` y `ENTREGA.local.md` están ignorados (`git check-ignore` lo confirma) y **nunca se subieron** (no aparecen en el historial).
- Búsqueda en todo el historial con `git log -G` y `git grep` por patrones de llaves (`AIza…`, `sbp_…`, `sb_secret_…`, JWT `eyJ…`, `service_role`, `tsk_…`), sin imprimir valores:
  - **Gemini (`AIza…`): 0 coincidencias.** No hay que rotarla por exposición en el repo.
  - JWT: aparece en `eas.json` (desde el commit `d7f5e20`). Se decodificó solo su claim `role`: es la **anon key** del proyecto (pública por diseño, la protege RLS). No es `service_role`.
  - `service_role`: solo en comentarios (`.env.example`, `supabase/config.toml`).
- `/api/analyze` en producción, probado con peticiones inválidas: `GET` → 405; 2 o 9 fotos → 400 "Envía entre 3 y 8 fotos del objeto."; imagen que no es JPEG/PNG → 400; JSON roto → 400. Ninguna respuesta expone datos internos. Además valida el tamaño (máx. 1,2 MB por foto y 4 M caracteres en total) y aplica un límite de 20 peticiones cada 10 min por IP (en memoria por instancia).
- RLS (revisión estática de `supabase/migrations`): activo en `profiles` y `creatures` con políticas por `auth.uid()`; bucket `scans` con `public = false` y políticas por carpeta `{auth.uid()}/…`.
- **Pendiente:** la prueba en vivo `node scripts/test-supabase.mjs` falla en el primer paso (`fetch failed`) porque `wgsbocrzmbplzppkjcxj.supabase.co` responde NXDOMAIN en DNS público (Google y Cloudflare), mientras `supabase.com` responde 200. Lo más probable es que el proyecto esté **pausado por inactividad** (plan gratis). Hay que restaurarlo desde el panel de Supabase y volver a ejecutar el script.

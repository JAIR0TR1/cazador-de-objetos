# QA: Cazador de Objetos 1.0.1

Estado al 23 de noviembre de 2026 (segunda ronda de QA: capas 0 a 7). Cada cifra sale de un comando ejecutado ese día en la rama `cierre-final`.

## 0. Resumen de la ronda de QA por capas

| Capa | Prueba | Resultado | Evidencia |
|---|---|---|---|
| 0 | Supabase responde | APROBADA | `/auth/v1/health` 200 tras restaurar el proyecto. La API tardó en recargar su caché de esquema (PGRST205) y se resolvió con `notify pgrst, 'reload schema'` |
| 0 | Backend Vercel responde | APROBADA | `/api/health` 200 (`gemini: true`, `tripo: false`) |
| 0 | Emulador Android | APROBADA | AVD `Medium_Phone_API_37.0`, Android 17, 1080×2400, Maestro 2.12.1 |
| 1 | `tsc`, `expo lint`, `expo-doctor` | APROBADA | sin errores; doctor 18/18 |
| 1 | `expo export` Android e iOS | APROBADA | bundles Hermes de 5,11 MB cada uno |
| 1 | Pruebas automáticas ×3 | APROBADA | **154 pruebas en 13 suites**, 3 corridas idénticas |
| 1 | Respuesta 200 malformada de `/api/analyze` | FALLIDA-CORREGIDA | cerraba la app; ahora error en español con Reintentar y modo demo (`ec8dee7`, 8 pruebas) |
| 1 | Migración invitado → cuenta, aislamiento A/B, doble toque en Guardar | APROBADA | `migrationAndIsolation.test.ts` (7 pruebas) |
| 1 | Respuestas malformadas de Gemini, `cleanImage`, rate limit | APROBADA | `__tests__/server/gemini.test.ts` (19 pruebas) |
| 2 | 13 entradas inválidas en producción (0, 1, 2, 9 y 20 fotos, base64 corrupto, PDF, imagen enorme, 5 MB, `{}`, no JSON, GET) | APROBADA | 400/405/413 con mensajes en español, sin stack ni datos internos (`scripts/test-backend.mjs`) |
| 2 | `/api/model3d` sin `TRIPO_API_KEY` | APROBADA | responde 200 `{fallback:true}`; la app usa el visor 360° |
| 2 | Rate limit | APROBADA | 429 en la petición 5 de una ráfaga, `Retry-After` 247 s |
| 2 | Análisis válido con 3, 5 y 8 fotos reales | **FALLIDA (externa, sin corregir)** | 502 en 2 a 3 s y 504 a los 46 s en todos los intentos. Hacen falta los logs de Vercel (`[gemini] todos los modelos fallaron`) |
| 3 | `scripts/test-supabase.mjs`, partes 1 a 3 (RLS, Storage, re-login, URLs firmadas, `username_available`) | APROBADA | 3 corridas; B no lee, edita ni borra nada de A, y un cliente sin sesión no ve nada |
| 3 | Parte 4 del mismo script (`/api/analyze`) | FALLIDA (la misma causa de Gemini) | 504 / 502 |
| 3 | Cuenta demo | APROBADA | inicia sesión y muestra 3 criaturas (Rumbóreo, Bajofón, Tazaurio) sin modificarlas |
| 4 | Flujo 1: onboarding, permiso de cámara, bienvenida | APROBADA | `e2e/01-primera-vez.yaml` |
| 4 | Flujo 3: validaciones, contraseña incorrecta, "Olvidé mi contraseña" | APROBADA | `e2e/03-iniciar-sesion.yaml` (36 pasos) |
| 4 | Flujo 2: validaciones de Crear cuenta | APROBADA | `e2e/02-crear-cuenta.yaml` |
| 4 | Flujo 5: escáner manual, 3 fotos, Listo, procesando | ver sección 0b | `e2e/05-invitado-escaneo.yaml` |
| 4 | Flujos 4.4 (crear cuenta con éxito y cerrar sesión), 7, 8, 9 y 10 | **NO EJECUTADOS** | no hubo tiempo; quedan en la lista de pruebas en teléfono |
| 5 | Escala de fuente 1.3 y 2.0, `uiautomator dump`, TalkBack, animaciones apagadas | **NO EJECUTADA** | queda para la lista manual |
| 6 | Arranque en frío, memoria y logcat | **NO EJECUTADA** | queda para la lista manual |
| 7 | Dependencias nativas frente a Expo Go SDK 54 | APROBADA | 27 de 27 incluidas con la misma versión (`expo/bundledNativeModules.json`) |
| 7 | `app.json` iOS | APROBADA | bundleIdentifier, permisos de cámara y movimiento en español, `supportsTablet: false` |
| 7 | Rutas por plataforma | APROBADA | teclado `padding` en iOS, compartir con URL en iOS; cámara denegada abre Ajustes |
| 7 | Movimiento denegado en iOS | MEJORA PENDIENTE | cae a modo manual y lo explica, pero no ofrece botón a Ajustes |
| 7 | Capturas a 375×667 y 430×932, `update:view` de iOS | **NO EJECUTADAS** | solo se verificó el export de iOS |

Notas honestas:
- La app se probó en **Expo Go SDK 54 dentro del emulador**, no con el APK: el enlace del APK del README ya no existe (`NoSuchKey`) y hay que generar un build nuevo.
- Las cuentas temporales de prueba (`qa.*@cazadordeobjetos.app`) quedan en Supabase con sus datos borrados; no se pueden eliminar con la llave pública. Bórralas en Authentication → Users.

## 1. Verificación automática

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | sin errores |
| `npx expo lint` | sin errores ni advertencias |
| `npx expo-doctor` | 18/18 checks |
| `npx expo export -p android` | bundle Hermes de 5,11 MB generado |
| `npm run test:ci` | **154 pruebas en 13 suites, todas en verde** (3 corridas seguidas con el mismo resultado) |
| `node scripts/test-supabase.mjs` | partes 1 a 3 aprobadas (RLS, Storage, re-login); parte 4 falla por Gemini (ver sección 0) |

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
- **Pendiente:** el análisis con Gemini falla en producción (502/504). Revisa los logs de Vercel del proyecto `cazador-de-objetos-api`: busca `[gemini] todos los modelos fallaron:`. Si dice 404 o "not found", los nombres de modelo de `server/lib/gemini.ts` están retirados; si dice "API key", hay que cambiar la llave en las variables de Vercel. Mientras tanto la app ofrece "Usar modo demo".

## 5. Listas para marcar

### Pruebas en Android real

- [ ] Instalar el APK (hay que generar uno nuevo: el enlace del README expiró) o abrir con Expo Go.
- [ ] Cámara: permiso, escaneo con giroscopio y captura manual.
- [ ] Vibración en cada ángulo y más intensa en la revelación de una Legendaria.
- [ ] Crear cuenta con éxito, cerrar y reabrir la app (la sesión se conserva) y cerrar sesión.
- [ ] Modo avión: guardar queda "pendiente"; al volver la red se sincroniza sola.
- [ ] Otra cuenta en el mismo teléfono: no se ve nada de la primera.
- [ ] Botón atrás de Android en cada pantalla y rotación de pantalla.
- [ ] Doble toque rápido en "Guardar en colección": una sola criatura.
- [ ] Texto del sistema al máximo y "Quitar animaciones": nada cortado.
- [ ] TalkBack: bienvenida, inicio, colección y ajustes se anuncian bien.
- [ ] Cámara denegada: aparece "Abrir Ajustes".

### Pruebas en iPhone real (Expo Go)

- [ ] Abrir `exp://u.expo.dev/814da54f-35b2-4fd9-be5f-40e290e7b679?channel-name=preview` y cerrar por completo y reabrir para recibir el update.
- [ ] Notch e indicador de inicio: nada tapado en Inicio, Resultado y formularios.
- [ ] Teclado sobre Crear cuenta e Iniciar sesión (iPhone SE si es posible).
- [ ] Permiso de cámara y de movimiento; si se niegan, la app lo explica (iOS no vuelve a preguntar).
- [ ] Giroscopio: el anillo se llena al rodear un objeto.
- [ ] Vibración (haptics) distinta por rareza.
- [ ] Gesto de deslizar para volver no rompe el flujo del escáner.
- [ ] Compartir una criatura (hoja de compartir de iOS).
- [ ] VoiceOver en bienvenida e inicio y texto grande (Ajustes → Accesibilidad).

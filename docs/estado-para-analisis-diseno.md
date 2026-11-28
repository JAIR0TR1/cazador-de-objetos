# Cazador de Objetos: estado al 28 nov 2026 (versión 1.0.1)

Contexto para analizar el diseño de software. Proyecto universitario de Diseño de Interfaces e Ingeniería de Software.
Repositorio: `C:\RECOLECTOR-OBJETOS` (GitHub `JAIR0TR1/cazador-de-objetos`), rama `main`, último commit `6871141`, sincronizado con GitHub.
Las reglas de trabajo están en `CLAUDE.md` y `AGENTS.md`: léelas primero. Nunca abras `.env`, `.env.local` ni `ENTREGA.local.md`.

## Qué hace la app

App móvil (Android e iOS) que escanea un objeto real en 360° con la cámara y el giroscopio (de 3 a 8 fotos). Una IA (Gemini, a través de un backend propio) lo convierte en una **criatura coleccionable** con:

- nombre, especie, historia y paleta de colores;
- rareza: Común, Rara, Épica o Legendaria;
- tipo: Fuego, Agua, Tierra, Aire, Metal, Tecno o Naturaleza;
- cuatro stats de 0 a 100: ataque, defensa, velocidad y energía.

La colección se guarda primero en el teléfono y, si el usuario tiene cuenta, se sincroniza con Supabase. Funciona sin servidor y sin internet gracias al modo invitado, el modo demo y una cola de pendientes.

## Stack

- **App:** Expo SDK 54 (expo 54.0.38), React Native 0.81.5, React 19.1, Expo Router 6, React Compiler, Reanimated 4.
- **Supabase:** autenticación, Postgres con RLS y un Storage privado llamado `scans`. La app solo lleva la llave pública (anon key).
- **Backend en Vercel** (`./server`, proyecto aparte):
  - `POST /api/analyze` llama a Gemini. Tiene una cadena de modelos de respaldo y descubre los modelos vigentes; un 429 en un modelo hace pasar al siguiente. El presupuesto total es de 52 s y tiene límite de peticiones por IP.
  - `/api/model3d` llama a Tripo3D. Es opcional: sin llave responde `fallback`.
  - `/api/health`.
- **EAS:** actualizaciones OTA en el canal `preview`, runtime `exposdk:54.0.0`.

## Arquitectura

```
app/ (rutas Expo Router)
  _layout · onboarding · welcome · sign-in · sign-up · forgot-password · import-collection
  (tabs)/ index · collection · profile   + botón central de escaneo
  scan → processing → result · creature/[id]
src/
  components/   sistema de diseño (AppText, Button, TextField, FormScreen, Chip, EmptyState, Skeleton, Icon, TabBar)
  features/     auth · collection · creatures · profile · scanner · sync
  services/     api (cliente HTTP con timeout, reintentos y validación de respuesta) · supabase · storage · motion · haptics
  theme/tokens.ts · types/
server/         backend Vercel
supabase/migrations/20261107200000_cuentas_y_coleccion.sql
```

### Estado y datos

- **Stores:** propios, sobre `useSyncExternalStore` (`src/services/storage/createStore.ts`):
  - `authStore`;
  - `collectionStore`, con caché por usuario y aislamiento entre cuentas;
  - `sessionStore`, para el escaneo en curso;
  - `settings` y `onboarding`.
- **Persistencia local:** AsyncStorage para los datos y `expo-file-system` para las fotos y los modelos `.glb`.
- **Sincronización:** `src/features/sync/sync.ts`. Cada criatura pasa por los estados local → pending → synced, y se reintenta con NetInfo y AppState.
- **Esquema de Supabase:**
  - tablas `profiles` y `creatures`;
  - RLS para que cada usuario solo lea, cree, actualice y borre lo suyo;
  - bucket privado `scans`, con una carpeta por usuario.

### Flujo principal

1. **Escáner:** toma las fotos y usa el giroscopio para saber cuánto se ha rodeado el objeto.
2. **Processing:** reduce las imágenes al presupuesto de 3,5 M caracteres y llama al backend. Si falla, ofrece reintentar, usar el modo demo o volver a escanear.
3. **Result:** el usuario guarda la criatura, que entra a la colección y a la cola de sincronización.

**Modo demo:** usa las fotos reales del usuario, un análisis de ejemplo elegido al azar y un modelo `.glb` de demostración, y marca la criatura como "DEMO".

### Decisiones de diseño

- Las llaves de IA solo viven en el backend.
- La app es offline-first.
- Se quedó en SDK 54 a propósito, por Expo Go.
- Tema oscuro único, con acento lima `#C6FF3D`.
- Accesibilidad WCAG AA: contraste, áreas táctiles de 44 pt y respeto del movimiento reducido.

## Calidad y pruebas

Resultados de la última corrida:

- `tsc` sin errores.
- **157 pruebas jest en 13 suites, todas en verde.** Cubren:
  - lógica: validación, errores de Supabase, cliente HTTP, presupuesto de imágenes, collectionStore, logros, sync, auth y aislamiento entre cuentas;
  - componentes;
  - servidor.
- **Integración real:** `scripts/test-supabase.mjs` (RLS, Storage, re-login e IA) y `scripts/test-backend.mjs`.
- **E2E:** Maestro en Android (`e2e/`), con capturas en `docs/qa-e2e/`.
- **Probado en dispositivos:** emulador Android con la webcam y un Moto G20 real con Expo Go 54.0.8. El análisis con IA funcionó en el teléfono.
- **Documentación:** `docs/QA.md`, `docs/portafolio.md`, `docs/demo-profesor.md`, `docs/screenshots/` (34 capturas), `README.md` y `PENDIENTES.md`.

## Problemas conocidos y deuda técnica

- **iPhone:** no funciona hoy, porque Expo Go de la App Store es SDK 58. Hace falta migrar de SDK 54 a 58 o hacer una build propia.
- **APK:** el enlace del README expiró y hay que generar uno nuevo con EAS.
- **Gemini:** depende de la disponibilidad de Google. El 24 nov hubo saturación (503) y cuota agotada (429). Ahora el modelo principal es `gemini-3.5-flash-lite`, configurado con la variable `GEMINI_MODEL`.
- **Mensaje de límite:** dice "un minuto", pero la espera real puede ser de hasta 10 minutos.
- **iOS sin giroscopio:** si se niega el permiso de movimiento, no hay un botón para abrir Ajustes.
- **Supabase:** quedan usuarios temporales `qa.*` que se deben borrar desde el panel.
- **Documentación:** `docs/QA.md` y `PENDIENTES.md` no mencionan los cambios del 24 nov (la llave nueva y la corrección del 429).

## Qué se pide analizar

El diseño de software:

- arquitectura y separación de capas;
- patrones usados: stores, cola de sincronización offline-first y cadena de respaldo de la IA;
- modelo de datos y seguridad (RLS);
- manejo de errores;
- testabilidad;
- deuda técnica;
- qué diagramas UML convendría incluir en la entrega: casos de uso, componentes, secuencia del escaneo y estados de sincronización.

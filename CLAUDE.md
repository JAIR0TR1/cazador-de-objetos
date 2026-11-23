# CLAUDE.md: Cazador de Objetos

Guía para agentes que trabajan en este repositorio. Las reglas generales de Expo están en [AGENTS.md](AGENTS.md) (se mantiene). Este archivo añade el contexto propio del proyecto.

## Qué es

App móvil (iOS y Android) que escanea un objeto real en 360° con la cámara y el giroscopio, lo manda a una IA (Gemini, vía nuestro backend) y lo convierte en una **criatura coleccionable** con rareza, tipo, stats e historia. La colección se guarda primero en el teléfono y, si el usuario tiene cuenta, se sincroniza con Supabase. Funciona sin servidor y sin internet (modo invitado, modo demo y cola pendiente).

Proyecto universitario (Diseño de Interfaces e Ingeniería de Software). Versión final: **1.0.1**.

## Arquitectura

```
App Expo (SDK 54, Expo Router, React 19, RN 0.81, React Compiler)
 ├─ UI: app/ (rutas)  +  src/components (sistema de diseño)
 ├─ Estado: stores propios con useSyncExternalStore (src/services/storage/createStore.ts)
 │    authStore · collectionStore (caché por usuario) · sessionStore (escaneo) · settings · onboarding
 ├─ Persistencia local: AsyncStorage (kv.ts) + expo-file-system (fotos y .glb)
 ├─ Sincronización: src/features/sync/sync.ts  (local → pending → synced, reintento con NetInfo/AppState)
 ├─ Supabase (Auth + Postgres con RLS + Storage privado "scans")  — solo anon key en la app
 └─ Backend Vercel (./server, proyecto aparte): POST /api/analyze → Gemini; /api/model3d → Tripo3D (opcional)
```

- **SDK 54 a propósito:** Expo Go del App Store se quedó en SDK 54. No subir de SDK sin pensar en el iPhone.
- **EAS:** owner `jairotr1`, runtime `exposdk:54.0.0`, canal `preview` compartido por Expo Go y el APK. Cambios solo de JS se publican con `eas update`; build nuevo solo si cambia código nativo (plugins, permisos, paquetes nativos).
- **Las llaves de IA viven solo en el backend** (variables de Vercel). La app solo lleva `EXPO_PUBLIC_*` (URL del backend, URL de Supabase y anon key, pública por diseño).

## Comandos

```bash
npx expo start                 # servidor de desarrollo (Expo Go: SDK 54)
npx tsc --noEmit               # tipos
npx expo lint                  # lint
npm test                       # pruebas unitarias y de componentes (jest-expo)
npm run test:ci                # igual, en modo CI con cobertura
npx expo-doctor                # dependencias y configuración
npx expo export -p android     # comprueba que el bundle compila
node scripts/test-supabase.mjs # integración real: RLS, Storage, re-login y /api/analyze
npx expo install <paquete>     # ÚNICA forma de instalar paquetes
npx eas-cli@latest update --branch preview --message "..."   # publicar update OTA
```

**Lista de verificación antes de dar algo por terminado:** tsc, lint, `npm run test:ci`, expo-doctor, export android y `scripts/test-supabase.mjs` (este último necesita red y el proyecto Supabase activo).

## Estructura

```
app/                      Rutas (Expo Router). Cada archivo es una pantalla.
  _layout.tsx             Fuentes, splash, Stack raíz, arranque de auth y sync
  (tabs)/                 Inicio · Colección · Perfil (+ botón central de escaneo en TabBar)
  onboarding, welcome, sign-in, sign-up, forgot-password, import-collection
  scan, processing, result, creature/[id]
src/
  components/             AppText, Button, TextField, FormScreen, Chip, EmptyState, Skeleton, Icon, TabBar
  features/               auth, collection, creatures (visores y tarjetas), profile, scanner, sync
  services/               api (cliente HTTP con timeout/reintentos), supabase, storage, motion, haptics
  theme/tokens.ts         Paleta, espaciado, radios, fuentes, springs
  types/                  Tipos de dominio (Creature, AnalysisResult…)
server/                   Backend Vercel (no lo indexa Metro ni ESLint)
supabase/migrations/      Esquema, RLS y bucket
scripts/                  test-supabase.mjs, create-demo-account.mjs, generate-assets.mjs
__tests__/ y *.test.ts(x) Pruebas jest-expo (mocks en jest/)
docs/                     Evaluación heurística, QA, portafolio, guion de demo, capturas y QR
```

Alias de importación: `@/*` → `src/*`, `@/assets/*` → `assets/*`.

## Sistema de diseño

- **Tema oscuro único.** Fondo `#0A0A0C`, superficie `#141418`, superficie elevada `#1C1C22`, texto `#F5F3F0`, texto secundario `#9E9CA6`.
- **Acento lima `#C6FF3D`** (texto encima: `#0A0A0C`). Un solo botón protagonista lima por pantalla.
- **Rarezas:** Común `#9AA0A6`, Rara `#2F6BFF`, Épica `#FFB020`, Legendaria `#FF5A1F`. Para **texto** usar `rarityColors[r].text` (Rara usa `#6E98FF`); en insignias, texto `onRarity` (oscuro). Todos los pares de texto pasan WCAG AA (≥ 4.5:1).
- **Fuentes:** Bricolage Grotesque (títulos: 600/700/800), Inter (cuerpo: 400/500/600), JetBrains Mono (etiquetas y números: 500/700). Usar siempre `AppText` con su `variant`.
- **Espaciado ×8:** `space = { xxs: 4, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, xxl: 48, xxxl: 64 }`. Radios 12/20/28. Botón 52 pt, área táctil mínima 44 pt.
- **Movimiento:** springs de `tokens.springs`. Todo efecto debe respetar `useReducedMotionPref()` (ajuste de la app o del sistema).
- **Texto grande:** `AppText` limita el multiplicador (1.6 cuerpo, 1.3 etiquetas). Los botones admiten 2 líneas.
- **Accesibilidad:** todo control táctil con `accessibilityRole` y `accessibilityLabel`; errores de formulario en línea con `accessibilityLiveRegion`.

## Reglas de trabajo (obligatorias)

1. Nunca abrir, imprimir ni copiar `.env`, `.env.local`, `ENTREGA.local.md` ni ninguna llave. Para saber si una variable existe, comprobar solo si está vacía (sí/no). No meter llaves en código, logs, docs ni commits.
2. Nada de relleno ni datos inventados: toda cifra en los docs sale de un comando ejecutado (conteo de pruebas, versiones, fechas).
3. Nada cortado en los bordes: safe areas, teclado sobre formularios, pantallas pequeñas (360×640) y grandes, texto grande del sistema.
4. No decir "listo" sin verificar: ejecutar, mirar el resultado y mostrar la evidencia.
5. La app debe seguir funcionando sin servidor y sin internet (modo invitado, modo demo, cola pendiente). No romper lo que ya funciona.
6. Antes de tocar APIs de Expo/EAS/React Native, leer la versión en `package.json` y consultar https://docs.expo.dev/versions/v54.0.0/. Instalar paquetes solo con `npx expo install`.
7. Usar las skills disponibles que apliquen (diseño, accesibilidad, pruebas, revisión de código). Si falta una, decirlo y seguir.
8. Trabajar por fases en una rama; al cerrar cada fase: tsc + lint + pruebas en verde y commit.

## Estado actual

Ver [PENDIENTES.md](PENDIENTES.md) (estado fechado) y [docs/QA.md](docs/QA.md) (qué se verificó y qué falta probar en teléfono).

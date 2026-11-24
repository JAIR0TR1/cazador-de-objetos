# Pendientes

Estado al 23 de noviembre de 2026 (versión 1.0.1, rama `cierre-final`).

## Hecho y verificado

- **Proyecto en Expo SDK 54** (el único que abre Expo Go del App Store). `tsc` sin errores, `expo lint` sin advertencias, `expo-doctor` 18/18, `expo export -p android` correcto.
- **154 pruebas automáticas en 13 suites** (jest-expo + Testing Library), en verde en 3 corridas seguidas. Ver [docs/QA.md](docs/QA.md).
- **Verificación visual** en web con Playwright: 34 capturas a 390×844 y 360×640 en [docs/screenshots/](docs/screenshots/), 0 elementos cortados.
- **8 defectos corregidos** en la revisión final: contraste de insignias y de "Rara", botones que se cortaban con texto grande, animación de botón con "Reducir movimiento", barra fija de Resultado, tarjeta "Última captura" colapsada en web, áreas táctiles de chips, enlaces y ajustes.
- **Seguridad:** ninguna llave de Gemini en el historial de git; el único JWT del repo es la anon key (pública). `.env*` y `ENTREGA.local.md` ignorados y nunca subidos. `/api/analyze` rechaza entradas inválidas sin exponer datos internos.
- **Update 1.0.1 publicado** en el canal `preview` (grupo `e66cb468` ("1.0.1 QA"), runtime `exposdk:54.0.0`). No cambió código nativo: el **APK `2c4fbdf2` sigue vigente** y los QR no cambian.
- Documentación: [CLAUDE.md](CLAUDE.md), [docs/portafolio.md](docs/portafolio.md), [docs/demo-profesor.md](docs/demo-profesor.md), [docs/QA.md](docs/QA.md).

## 1. Desplegar el endurecimiento del backend (recomendado)

El análisis con Gemini funciona (24 nov: 200 en 8 a 29 s). La falla del 23 nov fue del lado de Google. Para que una caída parecida dé mejores mensajes y logs, despliega el código nuevo de `server/lib/gemini.ts`:

```bash
cd server && npx vercel --prod
```

Además: el mensaje del rate limit dice "espera un minuto" pero la espera puede ser de hasta 10 minutos, y el APK del README ya no se puede descargar (genera uno nuevo con `npx eas-cli@latest build -p android --profile preview`).

## 2. Probar en teléfonos reales

No se puede automatizar: cámara, giroscopio, haptics, teclado sobre formularios, modo avión con NetInfo real, visor 3D en WebView, texto grande y TalkBack/VoiceOver. Lista de casillas en [docs/QA.md](docs/QA.md#3-pruebas-manuales-en-teléfono-para-hacer-antes-de-presentar).

## 3. Activar el modelo 3D con IA (Tripo3D): opcional

`TRIPO_API_KEY` sigue vacía, así que la app muestra el **visor 360° de fotos**.

```bash
cd server
npx vercel env add TRIPO_API_KEY production
npx vercel --prod
```

## 4. Mejoras futuras

- Pantalla propia para la nueva contraseña (deep link `cazador://` + `verifyOtp`). Hoy el enlace del correo abre la página de Supabase.
- Subir los `.glb` de Tripo a Storage (hoy solo se sincronizan las fotos y la ficha).
- Autenticar las llamadas al backend con el JWT de Supabase y un rate limit compartido (Redis/KV).
- Pruebas de las pantallas de cámara con un dispositivo real o un emulador (Maestro o Detox).

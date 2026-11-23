# Pendientes

Estado al 23 de noviembre de 2026 (versión 1.0.1, rama `cierre-final`).

## Hecho y verificado

- **Proyecto en Expo SDK 54** (el único que abre Expo Go del App Store). `tsc` sin errores, `expo lint` sin advertencias, `expo-doctor` 18/18, `expo export -p android` correcto.
- **154 pruebas automáticas en 13 suites** (jest-expo + Testing Library), en verde en 3 corridas seguidas. Ver [docs/QA.md](docs/QA.md).
- **Verificación visual** en web con Playwright: 34 capturas a 390×844 y 360×640 en [docs/screenshots/](docs/screenshots/), 0 elementos cortados.
- **8 defectos corregidos** en la revisión final: contraste de insignias y de "Rara", botones que se cortaban con texto grande, animación de botón con "Reducir movimiento", barra fija de Resultado, tarjeta "Última captura" colapsada en web, áreas táctiles de chips, enlaces y ajustes.
- **Seguridad:** ninguna llave de Gemini en el historial de git; el único JWT del repo es la anon key (pública). `.env*` y `ENTREGA.local.md` ignorados y nunca subidos. `/api/analyze` rechaza entradas inválidas sin exponer datos internos.
- **Update 1.0.1 publicado** en el canal `preview` (grupo `9eff7857`, runtime `exposdk:54.0.0`). No cambió código nativo: el **APK `2c4fbdf2` sigue vigente** y los QR no cambian.
- Documentación: [CLAUDE.md](CLAUDE.md), [docs/portafolio.md](docs/portafolio.md), [docs/demo-profesor.md](docs/demo-profesor.md), [docs/QA.md](docs/QA.md).

## 1. Arreglar el análisis con Gemini (urgente, antes de presentar)

Supabase ya está restaurado y pasa todas sus pruebas. Lo que falla es `/api/analyze` en producción (502 en 2 s o 504 a los 46 s), así que un escaneo real termina en el error con "Usar modo demo".

1. En Vercel, proyecto `cazador-de-objetos-api` → **Logs**: busca `[gemini] todos los modelos fallaron:`.
2. Si dice 404 o "not found": los nombres de modelo de `server/lib/gemini.ts` están retirados; cámbialos y redespliega.
3. Si dice "API key": genera una llave nueva y cámbiala en las variables de entorno de Vercel.
4. Comprueba con `node scripts/test-backend.mjs <carpeta-con-jpgs>`.

Además: el mensaje del rate limit dice "espera un minuto" pero la espera real puede ser de hasta 10 minutos, y el APK del README ya no se puede descargar (hay que generar uno nuevo con `eas build -p android --profile preview`).

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

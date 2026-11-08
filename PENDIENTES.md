# Pendientes

Estado al 7 de noviembre de 2026 (noche).

## Hecho y verificado

- Proyecto en **Expo SDK 54** (el único que abre Expo Go del App Store). `tsc`, `expo lint`, `expo-doctor` (18/18) y `expo export -p android` sin errores.
- EAS enlazado a `@jairotr1/cazador-de-objetos`, con update publicado en el canal `preview` (runtime `exposdk:54.0.0`) y APK de Android con el perfil `preview`.
- Supabase `cazador-de-objetos` (sa-east-1): migración aplicada, RLS y bucket privado `scans`, confirmación de correo desactivada.
- `node scripts/test-supabase.mjs` pasó completo: aislamiento entre usuarios A y B en filas y archivos, A vuelve a entrar y conserva sus datos, `/api/analyze` responde en producción.
- Cuenta demo con 3 criaturas (Común, Rara y Legendaria). Las credenciales están en `ENTREGA.local.md`.

## 1. Probar en teléfonos reales (antes de presentar)

No se puede automatizar: giroscopio, cámara, haptics, teclado sobre formularios, NetInfo real (modo avión) y el visor 3D en WebView. Sigue la lista "Qué probar" de la entrega.

## 2. Activar el modelo 3D con IA (Tripo3D): opcional

`TRIPO_API_KEY` sigue vacía, así que la app muestra el **visor 360° de fotos**.

```bash
cd server
npx vercel env add TRIPO_API_KEY production
npx vercel --prod
```

## 3. Mejoras futuras

- Pantalla propia para la nueva contraseña (deep link `cazador://` + `verifyOtp`). Hoy el enlace del correo abre la página de Supabase.
- Subir los `.glb` de Tripo a Storage (hoy solo se sincronizan las fotos y la ficha).
- Autenticar las llamadas al backend con el JWT de Supabase y un rate limit compartido (Redis/KV).
- Visor 3D nativo con `@react-three/fiber` en una *development build*.

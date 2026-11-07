# Pendientes

Estado al 7 de noviembre de 2026.

## 1. Activar el modelo 3D con IA (Tripo3D): opcional

`TRIPO_API_KEY` quedó vacía. Mientras siga así, `/api/model3d` responde `{ fallback: true }` y la app muestra el **visor 360° con las fotos** y una nube de puntos. El análisis con Gemini, las criaturas y la colección funcionan completos.

Para activarlo:

```bash
cd server
npx vercel env add TRIPO_API_KEY production   # pega la llave cuando la pida
npx vercel --prod                             # redeploy para aplicarla
curl https://cazador-de-objetos-api.vercel.app/api/health   # debe mostrar "tripo": true
```

La llave se obtiene en https://developers.tripo3d.ai, en la sección API Keys. Cada generación consume créditos.

## 2. Probar en un teléfono real

La verificación automática pasó: `tsc`, `expo-doctor` y `expo export` (iOS y Android). Además se probaron `/api/analyze` y `/api/model3d` con curl. Lo que **no** se pudo probar sin un dispositivo físico:

- El giroscopio y el llenado del anillo al rodear el objeto.
- La cámara y la captura automática.
- Los haptics.
- El visor 3D en el WebView: con Tripo desactivado, se puede ver con las criaturas demo desde *Perfil → Añadir criaturas demo*.

Antes de presentar, haz un escaneo completo en iPhone y en Android.

## 3. Mejoras futuras (fuera del alcance de la entrega)

- Rate limit compartido (Upstash Redis o Vercel KV) y autenticación de la app ante el backend.
- Visor 3D nativo con `@react-three/fiber` en una *development build*.
- Enviar a Tripo varias vistas (multiview) para mejorar la reconstrucción.

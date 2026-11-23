# Guion de demo (3 minutos)

Para presentar Cazador de Objetos 1.0.1 en vivo. Las credenciales de la cuenta demo (`@cazador_demo`, con 3 criaturas: Común, Rara y Legendaria) están en `ENTREGA.local.md`, que no se sube a git. No las escribas en pantalla compartida: tenlas abiertas en otra ventana.

## Antes de empezar (5 minutos antes)

1. **Supabase activo.** Abre el panel de Supabase y confirma que el proyecto `cazador-de-objetos` no está pausado. Si lo está, toca "Restore" y espera a que termine. Prueba en la computadora: `node scripts/test-supabase.mjs` debe terminar sin ✘.
2. **Teléfono:** batería > 50 %, brillo alto, "No molestar" activado, Wi-Fi o datos encendidos.
3. **App abierta** con la cuenta demo ya iniciada, en la pestaña **Inicio**.
4. **Objeto a escanear** sobre una mesa con buena luz y espacio para rodearlo (una taza, unos audífonos o una planta funcionan bien).

## Guion

| Tiempo | Pantalla | Qué hacer | Qué decir |
|---|---|---|---|
| 0:00 | Inicio | Mostrar la pantalla sin tocar nada. | "Cazador de Objetos convierte cualquier objeto real en una criatura coleccionable. Hay un solo botón protagonista: Escanear." |
| 0:20 | Escáner | Tocar **Escanear objeto** y rodear el objeto despacio. | "El giroscopio mide cuánto he rodeado el objeto. Cada segmento del anillo es un ángulo y toma una foto con vibración. Con 3 basta, con 8 es perfecto." |
| 0:50 | Escáner | Con 3 o más segmentos, tocar **Listo**. | "Las fotos se reducen a 1024 px antes de enviarlas, para que funcione con datos móviles." |
| 1:00 | Procesando | Esperar. | "Nuestro servidor en Vercel le pasa las fotos a Gemini. La llave de la IA nunca está en el teléfono." |
| 1:20 | Resultado | Dejar que se vea el destello y leer la rareza. | "La rareza depende de lo inusual del objeto. El destello y la vibración son más intensos cuanto más rara es." |
| 1:40 | Resultado | Tocar **Guardar en colección**. | "Se guarda al instante en el teléfono y después se sube a la nube. Sin señal queda pendiente y se sube sola al volver." |
| 2:00 | Colección | Tocar **Guardada en colección**, luego el filtro **Legendaria** y quitarlo. | "La colección tiene búsqueda, filtros y orden. Aquí están las de la cuenta demo, guardadas en Supabase con seguridad por usuario." |
| 2:20 | Detalle | Tocar **Rumbóreo**. | "Cada criatura tiene su ficha: stats, habilidad, historia y el objeto del que nace." |
| 2:40 | Perfil | Ir a **Perfil**. | "El perfil muestra estadísticas desde la base de datos, logros y ajustes de accesibilidad: reducir movimiento y apagar la vibración." |
| 2:55 | Cierre | | "Tiene 120 pruebas automáticas y funciona sin internet. Gracias." |

## Plan B

**Falla la red o el servidor durante el análisis.** La pantalla de error ofrece **Usar modo demo**. Tócalo y di: "Sin conexión la app no se rompe: usa una criatura de ejemplo marcada DEMO". Sigue el guion desde Resultado.

**Falla la cámara o el permiso.** Cierra el escáner y ve directo a **Colección** con las 3 criaturas de la cuenta demo. Di: "El escaneo lo muestro en el video / en el teléfono de respaldo". Sigue desde 2:00.

**No se puede iniciar sesión (Supabase caído o sin red).** En la bienvenida toca **Probar sin cuenta**, luego **Perfil → Añadir criaturas demo**. Tendrás Tazaurio (Común), Bajofón (Rara) y Rumbóreo (Legendaria) marcadas DEMO, y puedes seguir todo el guion. Di: "El modo invitado guarda todo en el teléfono; al crear una cuenta ofrece subirlo".

**La app se cierra o se congela.** Ábrela de nuevo: la sesión y la colección se recuperan del teléfono.

**Último recurso.** Muestra las capturas de `docs/screenshots/` (390×844) en la computadora.

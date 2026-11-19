# ASPLAYER 5.9.21 · Servicio opcional Workers AI

El servicio de Alftech Solutions se despliega en `https://asplayer-ai.alfrenix.workers.dev`, configurado de fábrica en ASPLAYER 5.9.21. La cuenta debe permanecer en **Workers Free**, sin actualizar a un plan de pago. La cuota compartida de Workers AI es de 10 000 neurons al día y se restablece a las 00:00 UTC. Si se agota, la app conserva la sinopsis original y la búsqueda convencional.

## Activación

1. Entra en https://dash.cloudflare.com/ y crea o inicia sesión en tu cuenta gratuita. Si la cuenta pide un plan de pago, no continúes con ese plan.
2. Desde este directorio y con Node.js instalado, ejecuta `npx wrangler login` y autoriza tu cuenta. Ejecuta `npx wrangler deploy` para desplegar el Worker y sus bindings AI y AI_LIMIT. No se requiere una clave de OpenAI.
3. Copia la URL HTTPS `https://asplayer-ai.<tu-subdominio>.workers.dev` que devuelve el despliegue. No copies una ruta `/api/...`.
4. En ASPLAYER 5.9.21 el servicio oficial viene preconfigurado. En Ajustes → Cloudflare Workers AI se puede cambiar, borrar para desactivar, o restaurar el enlace predeterminado. Las URLs personalizadas válidas se conservan; una vez configurada esta versión, también se conserva la desactivación. Para traducciones, selecciona Sinopsis IA (la sinopsis del proveedor sigue siendo el valor inicial). Para preguntas y recomendaciones, abre Asistente IA desde el catálogo de películas o series.
5. Para avisos opcionales, agrega las variables `NOTICE_ID` (identificador nuevo para cada aviso), `NOTICE_ES` y `NOTICE_EN` en la configuración del Worker. Sin ellas no habrá avisos.

El asistente procesa consultas y devuelve palabras clave. La app coteja esas palabras localmente contra títulos y metadatos que ya están cargados, respetando control parental. No hay búsqueda web ni acceso a credenciales o historial. Las sinopsis se traducen a partir de texto del proveedor, no de una fuente verificada independiente. La IA puede equivocarse; la app no presenta sus respuestas como hechos verificados. El servicio no debe recibir credenciales ni datos personales en las consultas. La app envía únicamente las preguntas expresas y las sinopsis elegidas con IA habilitada. Cloudflare es el procesador externo; revisar la política de privacidad y declaración de datos de Play antes de publicar.

El límite de 5 inferencias/minuto por IP y ubicación de Cloudflare reduce abuso; no es una autenticación ni un límite global exacto. El plan Free es el límite económico definitivo; no activar planes de pago. `GET /api/announcements` funciona también con 5.9.20; la traducción y asistente requieren 5.9.21. Pruebas locales: `node ../tests/test-online-ai.mjs` (desde este directorio).

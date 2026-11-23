# ASPLAYER 5.9.21 · Servicio opcional Workers AI

## Centro de avisos (Worker v4; compatible con ASPLAYER 5.9.25 sin nuevo AAB)

- Abrir `https://asplayer-ai.alfrenix.workers.dev/admin` desde un navegador. El panel no contiene credenciales ni guarda la contraseña en el dispositivo.
- En Cloudflare, Workers & Pages → `asplayer-ai` → Settings → Variables and Secrets, añadir un **Secret** de nombre `NOTICE_ADMIN_TOKEN` con una contraseña aleatoria exclusiva de al menos 24 caracteres (preferiblemente 32 o más). Guardarla en un administrador de contraseñas; nunca en GitHub, APK, chat ni texto plano. El panel permanece cerrado si falta el secreto.
- El despliegue configura el objeto Durable SQLite `NOTICES` y el límite `ADMIN_LIMIT`. Mantener Workers Free; no habilitar facturación.
- Escribir el mensaje ES/EN, traducir el otro idioma con IA si se desea, revisar la vista previa, elegir publicación/retirada opcionales y pulsar Publicar. Se conservan hasta 20 comunicados recientes. Los borradores con fechas futuras no son públicos hasta su inicio.
- La app existente recibe el último aviso activo mediante `announcement` en `/api/announcements`; consulta en Inicio, al volver al primer plano o cada 15 minutos durante el uso. El aviso se puede cerrar y no se repite con el mismo ID. Los avisos son independientes del interruptor IA. Retirar impide futuras entregas; un aviso ya visible puede requerir cerrarlo. Los enlaces se muestran como texto plano en la versión instalada. No hay notificaciones push con la app cerrada; eso requeriría actualizar la app.
- Pruebas sin usuarios reales: `node tests/test-online-ai.mjs && node tests/test-notices.mjs` desde la raíz. El smoke test de producción no publica avisos.

El servicio de Alftech Solutions se despliega en `https://asplayer-ai.alfrenix.workers.dev`, configurado de fábrica en ASPLAYER 5.9.21. La cuenta debe permanecer en **Workers Free**, sin actualizar a un plan de pago. La cuota compartida de Workers AI es de 10 000 neurons al día y se restablece a las 00:00 UTC. Si se agota, la app conserva la sinopsis original y la búsqueda convencional.

## Activación

1. Entra en https://dash.cloudflare.com/ y crea o inicia sesión en tu cuenta gratuita. Si la cuenta pide un plan de pago, no continúes con ese plan.
2. Desde este directorio y con Node.js instalado, ejecuta `npx wrangler login` y autoriza tu cuenta. Ejecuta `npx wrangler deploy` para desplegar el Worker y sus bindings AI y AI_LIMIT. No se requiere una clave de OpenAI.
3. Copia la URL HTTPS `https://asplayer-ai.<tu-subdominio>.workers.dev` que devuelve el despliegue. No copies una ruta `/api/...`.
4. En ASPLAYER 5.9.21 el servicio oficial viene preconfigurado. En Ajustes → Cloudflare Workers AI, el interruptor IA activada/desactivada controla tanto el asistente como las sinopsis IA, conserva su valor entre reinicios y no altera el enlace ni los avisos. También se puede cambiar, borrar o restaurar el enlace predeterminado. Las URLs personalizadas válidas se conservan. Para traducciones, selecciona Sinopsis IA (la sinopsis del proveedor sigue siendo el valor inicial). Para preguntas y recomendaciones, abre Asistente IA desde el catálogo de películas o series.
5. Para avisos opcionales, agrega las variables `NOTICE_ID` (identificador nuevo para cada aviso), `NOTICE_ES` y `NOTICE_EN` en la configuración del Worker. Sin ellas no habrá avisos.

El asistente procesa consultas y devuelve palabras clave. La app coteja esas palabras localmente contra títulos y metadatos que ya están cargados, respetando control parental. No hay búsqueda web ni acceso a credenciales o historial. Las sinopsis se traducen a partir de texto del proveedor, no de una fuente verificada independiente. La IA puede equivocarse; la app no presenta sus respuestas como hechos verificados. El servicio no debe recibir credenciales ni datos personales en las consultas. La app envía únicamente las preguntas expresas y las sinopsis elegidas con IA habilitada. Cloudflare es el procesador externo; revisar la política de privacidad y declaración de datos de Play antes de publicar.

El límite de 5 inferencias/minuto por IP y ubicación de Cloudflare reduce abuso; no es una autenticación ni un límite global exacto. El plan Free es el límite económico definitivo; no activar planes de pago. `GET /api/announcements` funciona también con 5.9.20; la traducción y asistente requieren 5.9.21. Pruebas locales: `node ../tests/test-online-ai.mjs` (desde este directorio).


## Worker Control · diseño ALFTECH SOLUTIONS y sinopsis documentadas (noviembre 2026)

- Panel: `/admin` ahora usa identidad ALFTECH SOLUTIONS con el logo de ASPLAYER del repositorio, una vista responsiva para móvil/escritorio, indicadores de avisos activos/programados/retirados, historial, vista previa español/inglés, plantillas y opciones de vencimiento rápido. Las contraseñas permanecen en memoria solamente; nunca están embebidas en el panel ni guardadas en el navegador.
- Los comunicados continúan como **texto plano** (`announcement.message`, hasta 400 caracteres por idioma). Se conservan `announcement`, `announcements`, `expires_at`, retirada y Durable Object, de modo que la app 5.9.25–6.0.3 no requiere cambios.
- La caducidad o retirada deja de **entregar** el aviso en próximas consultas. No puede cerrar de manera remota un mensaje ya visible en las apps existentes: el cliente no procesa órdenes de retiro para banners mostrados ni dispone de temporizador conectado al Worker. Una duración seleccionada en el panel no promete cierre inmediato en la pantalla del usuario.
- Las versiones mencionadas tampoco interpretan un diseño enriquecido enviado por el Worker: ni HTML, ni CSS, ni justificación, ni espacios personalizados. Por eso se ofrecen plantillas concisas que funcionan en el diseño actual.
- Si el servidor de origen omite una sinopsis, `POST /api/synopsis` con `{title, category, lang, generate:true, year?}` busca coincidencias documentadas en TVmaze (series), Wikipedia (series y películas) y, **solo si se configura** un token de lectura, TMDB. La IA **no genera una trama de memoria** cuando faltan referencias fiables; devolverá `{grounded:false,generated:false,synopsis:""}` en obras ambiguas o sin información.
- La respuesta conserva el contrato esperado desde 5.9.25: `grounded:false`, `generated:true` y `synopsis` no vacío para texto generado a partir de una fuente real. Se incluyen `source`, `source_url` y `verified_reference` como metadatos opcionales ignorables por apps antiguas. El texto visible incorpora atribución y URL de la fuente.
- El idioma lo decide `lang: es | en`, transmitido por la aplicación. Cuando la fuente está en otro idioma, el Worker utiliza Workers AI para traducir/resumir fielmente la descripción pública. Si falla la traducción, no entrega texto en el idioma equivocado.
- El Worker **no recibe imágenes ni URL de la portada del IPTV** de estas apps; no se declara ninguna comparación visual de posters. El cartel de fuentes externas puede existir, pero no identifica por sí solo el contenido del servidor.
- Atribución: TVmaze utiliza CC BY-SA; Wikipedia usa licencias libres con obligaciones de atribución. La respuesta incluye nombre y enlace de fuente. Si se habilita TMDB, revisar condiciones y atribución exigida por TMDB (incluida la sección de créditos de la app) antes de uso en producción. El token `TMDB_READ_TOKEN` debe configurarse como **secret de Cloudflare**, nunca publicarse en GitHub o APK; si no está configurado, TMDB no se consulta.
- No se envían usuario, contraseña, URL del servidor de origen, historial de reproducción ni catálogo completo a las fuentes de metadatos. Únicamente se consulta título normalizado, tipo, idioma y año opcional.
- Los resultados dependen de la disponibilidad de las APIs y la cuota de Workers AI. Las pruebas automáticas usan datos simulados y no acreditan el estado del Worker desplegado.

### Prueba y publicación

Desde la raíz del repositorio: `node tests/test-online-ai.mjs && node tests/test-notices.mjs`. Hay además un flujo de GitHub Actions de validación aislada para la rama de Worker.

La publicación requiere acceso autenticado a la **cuenta Cloudflare que aloja** `asplayer-ai.alfrenix.workers.dev`:

```bash
cd cloudflare-ai
npx wrangler login
npx wrangler deploy
```

Verificar después `https://asplayer-ai.alfrenix.workers.dev/admin`, `/api/announcements?lang=es` y pruebas de `POST /api/synopsis` sin datos de cuentas IPTV. **Subir cambios a GitHub no publica automáticamente el Worker.**

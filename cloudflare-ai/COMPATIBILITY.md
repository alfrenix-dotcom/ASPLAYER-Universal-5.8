# ASPLAYER – compatibilidad permanente del Worker (desde 5.9.25)

Requisito de Alfredo Martínez de Escobar Rueda: mantener la compatibilidad del Worker de ASPLAYER 5.9.25 en todas las actualizaciones Android y Android TV posteriores, incluidas las 6.x.

- Conservar la URL HTTPS predeterminada `https://asplayer-ai.alfrenix.workers.dev`, respetar URLs personalizadas y el interruptor de IA guardado por el usuario.
- Mantener las rutas y contratos existentes del Worker v4: `/api/assistant`, `/api/synopsis`, `/api/announcements` y el panel de avisos. No exigir a usuarios antiguos actualizar su app para seguir recibiendo avisos.
- La IA envía únicamente la consulta explícita o los datos de sinopsis requeridos; nunca credenciales del IPTV, historial ni catálogos completos. La clasificación bilingüe se hace en el dispositivo a partir de resultados compatibles del Worker.
- Conservar el plan Free y el control parental. Los avisos son independientes del interruptor IA. No desplegar ni alterar el Worker cuando una actualización de interfaz o reproductor no lo necesita.
- Antes de cada entrega ejecutar `node tests/test-online-ai.mjs`, `node tests/test-notices.mjs` y `node tests/test-ai-ui.cjs` (este último con Playwright). Los clientes antiguos deben seguir funcionando con la misma API.

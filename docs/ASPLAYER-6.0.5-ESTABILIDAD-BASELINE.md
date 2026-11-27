# ASPLAYER 6.0.5 — diagnóstico conservador Android TV y móvil

## Alcance

Esta rama es **solo de diagnóstico**. No contiene modificaciones de `app/`, ni cambios de `applicationId`, firma, reproductores, Worker, inicio de sesión, historial, favoritos, diseño o navegación. No sirve como actualización 6.0.6: se conserva 6.0.5 como base intacta.

## Prueba automatizada disponible

`node tests/performance/measure-6.0.5.cjs` abre la interfaz local de ASPLAYER en Chromium y mide:

- Inicialización del documento e interfaz local.
- Representación inicial de un catálogo sintético de 1200 elementos.
- Límite de 100 tarjetas simultáneas del paginador.
- Desplazamiento mediante 61 pulsaciones ArrowDown y orden exacto del foco en modo TV.
- Desplazamiento móvil y conservación de la ventana limitada de tarjetas.
- Aplicación de un filtro sintético, errores de JavaScript y tareas largas del navegador.
- Memoria del montón JavaScript cuando Chromium expone el dato.

Los resultados se escriben en `diagnostics-output/baseline.json` y `baseline.md` y se conservan como artefactos de GitHub Actions. Son **medidas indicativas** de Chromium dentro de GitHub CI; el tiempo de pulsación incluye la automatización Playwright. No describen FPS de vídeo, rapidez de un servidor IPTV, consumo real de Android ni el primer fotograma de LibVLC. Las pruebas no usan usuarios, contraseñas ni servidores reales.

## Pruebas adicionales sin cambiar la aplicación

Se ejecutan las pruebas existentes de catálogo, cruceta, cuadros de diálogo y cierre manual. Un control de Git confirma que ningún archivo de `app/` ha cambiado respecto a la rama 6.0.5.

## Medición física pendiente (requiere dispositivo real)

Para obtener resultados comparables:

1. Usar la misma compilación 6007 de ASPLAYER y el mismo dispositivo en tres recorridos; anotar versión de Android, versión de WebView, RAM y resolución, sin credenciales ni URLs privadas.
2. En Android TV recorrer Inicio → TV → Películas → Series → Ajustes → Inicio por cruceta; volver y abrir/cerrar un canal o vídeo autorizado. Registrar si el foco salta, falla o se congela.
3. En Android móvil repetir inicio, scroll, búsqueda y cambio de categorías; evitar cambiar ajustes entre repeticiones.
4. Con ADB autorizado por el propietario, ejecutar `adb shell dumpsys meminfo com.alftech.asplayer.universal.vlc.final.v592` y `adb shell dumpsys gfxinfo com.alftech.asplayer.universal.vlc.final.v592 framestats` mientras la app funciona, en cada escenario. Los datos de estos comandos son observacionales; no eliminan los datos de ASPLAYER.
5. Medir arranque frío, tiempo al primer fotograma, pausas, memoria PSS y frames lentos con Perfetto/Android Studio cuando sea posible. Evitar registrar URLs de reproducción, contraseñas, tokens o direcciones IP.
6. Repetir el protocolo con una única optimización propuesta y descartar cualquier cambio que empeore la estabilidad o cambie la navegación.

## Criterios antes de aceptar una optimización

- Ninguna regresión en autenticación, sesión, PIN, control parental, historial, favoritos, Worker, salida con Atrás ni búsqueda.
- Un solo sistema de manejo de foco: ningún listener o temporizador adicional que pueda competir con el actual.
- Las funciones, perfiles de búfer, decodificación, subtítulos y motores LibVLC/Media3 no se modifican por conveniencia.
- Catálogos, contenido y favoritos deben reflejar los mismos datos; la caché no debe ocultar cambios reales.
- Mejoras reproducibles en tres pruebas sobre un dispositivo objetivo, sin nuevos bloqueos, cierres o saltos de foco.
- No publicar, fusionar ni reemplazar 6.0.5 si estos criterios no se cumplen.

**Estado:** este documento establece la referencia. No supone que ya se hayan probado televisores o teléfonos físicos.

# Preparación de Google Play — ASPLAYER 5.9.17
## Identidad
- Application ID: com.alftech.asplayer.universal.vlc.final.v592.
- versionName: 5.9.17; versionCode: 5918.
- Android App Bundle release (no depurable); API objetivo 36, API mínima 21.
- Android móvil y TV; LibVLC 3.7.7.
- No modificar la identidad ni limpiar los datos de usuario.

## Antes de subir
1. Descargar el artefacto PLAY-RELEASE-UNSIGNED generado por el flujo principal.
2. Firmar el AAB con la clave de carga que corresponda al certificado registrado en Play Console. No usar la clave debug ni generar otra, ni compartir contraseñas.
3. Verificar con `jarsigner -verify -verbose -certs ASPLAYER-5.9.17-signed.aab` y `keytool -printcert -jarfile ASPLAYER-5.9.17-signed.aab`. Comparar SHA-256 con el certificado de carga de Integridad de la app en Play Console.
4. Confirmar que 5918 supera los versionCode ya utilizados en todas las pistas.
5. Subir primero a la pista de pruebas correspondiente; revisar avisos de Play Console, probar actualización encima de 5.9.7 y confirmar sesiones, historial y reproducción en móvil, TV y dispositivos de páginas de 16 KiB. No publicar hasta verificar.
6. Revisar los formularios de acceso (instrucciones privadas para revisores), seguridad de datos, privacidad, clasificación de contenido y compatibilidad con Android TV. El servidor se introduce manualmente; se admite HTTP sin cifrado (no se debe afirmar que toda transmisión está encriptada). No incluir credenciales o PIN en notas públicas.
7. Revisar obligaciones de licencias LibVLC antes de distribución.

## Notas de versión (es)
- Eliminada la franja inferior de TV; contactos del login solo informativos.
- Apertura de canales directamente en LibVLC, prioridad al formato disponible, menor búfer inicial adaptativo y menos trabajo en segundo plano.
- Navegación más fluida con el control de Android TV y pantallas táctiles.
- Categorías verticales y acceso rápido a historial y continuar viendo.
- Mejoras en los controles de reproducción y modo adaptativo.
- Nuevo icono y mejoras visuales de la pantalla de inicio.

## Release notes (en)
- Removed TV footer; login contacts are informational only.
- Faster live channel startup path and reduced background UI processing.
- Improved Android TV remote and touchscreen navigation.
- Vertical categories and quick access to history and continue watching.
- Improved playback controls and adaptive playback mode.
- Updated app icon and Home interface.

La comprobación estructural del AAB y de ELF de 16 KiB no sustituye las pruebas en dispositivos ni la validación de Google Play. El AAB sin firma no se puede subir directamente.

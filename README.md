# ASPLAYER Universal 5.8.2 — Interfaz completa + LibVLC

Este repositorio mantiene el proyecto privado de Alftech Solutions. La compilación de la aplicación principal se realiza con **.github/workflows/build-integrated.yml**, que restaura el código completo desde `sources/ASPLAYER-5.8.2-Complete-Project.zip`.

- Preserva la interfaz de ASPLAYER 5.7.1 con el selector de servidores, login, categorías, búsqueda, historial, favoritos y Seguir viendo.
- Integra LibVLC 3.7.7 para TV, películas y series; el motor proviene de VideoLAN, no de IPTV Smarters Pro.
- Paquete experimental independiente `com.alftech.asplayer.universal.vlc.full` para instalar junto a las versiones anteriores.
- Compile SDK 36, Android 5+ como mínimo; prueba en Android 16 pendiente.
- Tres perfiles de caché: Rápido, Normal, Ultra. No garantizan latencias exactas.
- Los servidores originales utilizan HTTP y las credenciales almacenadas por el frontend heredado no están protegidas mediante Android Keystore. Evita usar cuentas sensibles hasta resolver este riesgo.

El APK debug se descarga en **Actions → Build ASPLAYER 5.8.2 Full UI LibVLC APK → Artifacts**. No colocar cuentas, contraseñas, claves API ni certificados privados en este repositorio.

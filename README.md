# ASPLAYER Universal · Alftech Solutions

**Proyecto principal: ASPLAYER 5.9.17 (código de versión 5917).**

Aplicación universal para Android móvil y Android TV, con reproductor LibVLC,
interfaz bilingüe, control remoto y pantalla táctil. El código completo se encuentra
en la rama `main`; no es necesario reconstruirlo mediante ZIP ni aplicar parches.

## Retomar el desarrollo

- Usar siempre la rama `main` y abrir el proyecto Gradle de la raíz.
- Interfaz: `app/src/main/assets/index.html`, `app.js` y los módulos `features-*.js`.
- Reproductor, DPAD nativo y puente WebView: `app/src/main/java/com/alftech/asplayer/universal/MainActivity.java`.
- Sesión protegida localmente: `SessionVault.java`.
- Icono adaptativo Android: `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`.
- Pruebas de navegación y UI: `tests/test-tv-modal.cjs`.
- Dependencias y versión: `app/build.gradle`.
- Los archivos `patches/`, `sources/`, `branding/` y `archive/workflows/` son referencias históricas; no se aplican al compilar main.

## Estado del punto de partida 5.9.17

- Listas verticales de categorías y contenido en TV y móvil; All/Todos por defecto.
- Cruceta con foco visible, transferencia de foco al contenido, confinamiento en diálogos y retorno al elemento anterior.
- Historial y Continuar viendo integrados al principio de las categorías; favoritos de TV.
- LibVLC 3.7.7, modo adaptativo por defecto, controles de reproducción con DPAD, audio, subtítulos y formato.
- Cuenta manual, sesión persistente, control parental y privacidad.
- Contactos informativos fijos, banner sin número de versión antiguo, nuevo logo y recurso de icono adaptativo.

## Compilar

Requisitos: JDK 17, Android SDK 36, Build Tools 35.0.0, Gradle 8.11.1.

```sh
gradle :app:assembleDebug
gradle :app:bundleRelease
```

En GitHub Actions seleccionar **ASPLAYER Universal — Build and Validate**.
El flujo compila directamente el código de main, valida la interfaz y comprueba
los recursos del icono en el APK. Los artefactos se generan por versión.

## Reglas para futuras actualizaciones

- Mantener el applicationId `com.alftech.asplayer.universal.vlc.final.v592`.
- Aumentar versionCode por cada entrega y actualizar versionName,
  getAppVersion() y la versión mostrada en Ajustes (no los nombres de módulos históricos).
- Nunca borrar las sesiones, ajustes, favoritos o historial en una migración.
- Mantener Android TV y móvil en el mismo proyecto y probar las dos modalidades.
- El APK debug es únicamente para pruebas: no se debe instalar encima de
  una versión de Google Play firmada con otra clave. El AAB de release
  requiere clave de carga y distribución con Play App Signing para una
  actualización compatible. No incluir claves ni contraseñas en el repositorio.
- No declarar reproducción o navegación de hardware real verificadas únicamente
  por las pruebas de navegador. El rendimiento depende del dispositivo y del servidor.

Punto de referencia: [compilación validada 5.9.17](https://github.com/alfrenix-dotcom/ASPLAYER-Universal-5.8/actions/runs/44103839438).
La estructura anterior está preservada en la rama `archive/pre-principal-5.9.17`.

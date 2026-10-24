# Tiny Royals · SGX Play 👑

Un teatro interactivo de muñecos 3D donde niños y niñas pueden convertirse en príncipes o princesas y controlar su personaje con la cámara. Creado por **Spatialgineers** como versión lite de SGX vTuber Engine.

## Qué incluye

- Cuatro personajes: Princesa Luna, Princesa Sol, Príncipe Leo y Príncipe Nico.
- Colores de vestuario, tonos de piel, peinados y corona opcional.
- Cabeza, brazos y piernas controlados por cámara; expresiones faciales cuando el dispositivo las soporta.
- Movimiento elástico con resortes y restricciones, estilo muñeco/ragdoll.
- Saludos, baile, modo gelatina, varita y partículas mágicas.
- **¡Atrapa estrellas!**: un juego de 45 segundos. Atrapa estrellas con las manos, la cabeza o los pies (con cámara o arrastrando al muñeco). Las coronas doradas valen 5, los combos multiplican los puntos (x2, x3) y las nubes gruñonas rompen el combo. Al final ganas de 0 a 3 coronas y se guarda tu récord.
- **Álbum de stickers**: 14 stickers que se desbloquean jugando (saludar, bailar, visitar los tres reinos, hacer cosquillas, combos, patadas estelares…).
- **Niveles reales**: de *Aprendiz real* a *Reina/Rey de la magia*, según estrellas y stickers.
- Cosquillas: toca al muñeco y se ríe con corazones.
- Sonidos sintetizados (sin archivos), música de baile, confeti y animaciones con rebote.
- Tres escenarios: Castillo de nubes, Jardín encantado y Reino lunar.
- Juego sin cámara: arrastrar al personaje y usar botones.
- Pantalla completa y descarga de fotos que muestran únicamente al muñeco y su escenario.
- Preferencias locales y soporte PWA mediante manifest y service worker.

## Ejecutar en tu computadora

Necesitas **Node.js 20 o superior**. Extrae el ZIP, abre una terminal dentro de `tiny-royals` y ejecuta:

```bash
npm start
```

Abre **http://localhost:8080**. El app tiene sus librerías, modelos y fuentes incluidos: no necesitas instalar dependencias para jugar.

Otra opción, si tienes Python 3:

```bash
python3 -m http.server 8080 --directory dist
```

Para comprobar el proyecto: `npm run check`.

**No abras `index.html` haciendo doble clic.** Los módulos, el worker, WASM y la cámara necesitan un servidor. `localhost` permite probar la cámara; al publicar en internet necesitas HTTPS. Para probar desde un teléfono usa una publicación HTTPS; una dirección HTTP de tu red local normalmente no habilita la cámara.

## Cómo jugar

1. Escoge princesa o príncipe y personaliza su apariencia.
2. Pulsa **Encender cámara** y permite el acceso. Un adulto puede ayudar con ese permiso.
3. Mantén visibles tu cabeza y brazos. Da un paso atrás para que se vean también tus piernas y pies.
4. Mueve los brazos, inclina la cabeza y sonríe. Levanta ambas manos para lanzar magia.
5. El botón ⊕ de la vista de cámara vuelve a centrar el tracking.
6. También puedes pulsar **Jugar sin cámara**, arrastrar el muñeco y usar los botones.
7. Pulsa **¡Atrapa estrellas!** para jugar una ronda y llenar tu álbum de stickers.

Atajos de teclado: `G` empieza el juego de estrellas, `W` saluda, `D` baila, `J` gelatina, `M` magia. Los atajos no se activan mientras estás usando un control o el diálogo de ayuda.

## Subirlo a GitHub

1. Crea un repositorio llamado `tiny-royals` en tu cuenta; puedes elegir **Public**.
2. Descomprime este ZIP.
3. En el repositorio vacío usa **uploading an existing file** o **Add file → Upload files**.
4. Sube el **contenido** de la carpeta `tiny-royals`: `dist`, `scripts`, `README.md`, `package.json`, `package-lock.json` y `.gitignore`.
5. Confirma con **Commit changes**.

El ZIP como archivo adjunto no sustituye subir el código descomprimido. Si tu navegador no permite cargar carpetas, usa GitHub Desktop o Git:

```bash
git init
git add .
git commit -m "Initial release of Tiny Royals"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tiny-royals.git
git push -u origin main
```

Reemplaza `TU_USUARIO` por el nombre de tu cuenta. Si el repositorio ya contiene archivos, clónalo primero y copia este proyecto dentro para conservar su historial. No hace falta subir `node_modules`.

## Publicar el app

GitHub guarda el código. Para que otras personas puedan jugar necesitas hosting estático con HTTPS, publicando el **contenido de `dist/` en la raíz del sitio**. El app usa rutas absolutas como `/tracking/worker.js`: un despliegue bajo una subcarpeta, como `/tiny-royals/`, requiere adaptar esas rutas, el manifest y el service worker.

La configuración `.openai/hosting.json` de esta copia solo declara `dist` como directorio estático; no contiene la identidad del Site original ni credenciales. No es necesaria para otros proveedores de hosting.

## Estructura

```text
tiny-royals/
  README.md
  package.json
  package-lock.json
  scripts/
    serve.mjs          Servidor local sin dependencias
    verify.mjs         Verificaciones automáticas
  dist/
    index.html         Interfaz
    style.css          Diseño responsive
    app.js             Controles e interacciones
    scene.js           Personajes y mundos Three.js
    motion.js          Mapeo de cámara y física elástica
    camera.js          Ciclo de vida de cámara y worker
    sw.js              Caché de assets
    manifest.webmanifest
    fonts/             Fuentes locales
    vendor/            Three.js y su licencia
    tracking/
      worker.js        Inferencia en segundo plano
      vision_bundle.js MediaPipe Tasks Vision
      pose.task        Modelo de cuerpo
      face.task        Modelo facial
      wasm/            Runtime WASM con y sin SIMD
```

## Tracking y privacidad

El vídeo se procesa **en el dispositivo**, en un worker. No hay backend de vídeo, grabación automática, envío de imágenes ni solicitud de micrófono. Las imágenes y landmarks se mantienen en memoria para animar al personaje. La cámara se apaga al ocultar o salir de la página. La apariencia se guarda en `localStorage`; el service worker guarda assets del app, no vídeo.

El tracking admite una persona a la vez. Envía como máximo un frame a la vez, a aproximadamente 15 Hz y hasta 480 píxeles de ancho. Las expresiones se calculan en frames alternos. Si el modelo facial no carga, el movimiento del cuerpo puede continuar. La carga inicial de los modelos necesita conexión o que los assets ya estén disponibles en caché.

## Verificación

```bash
npm run check
```

La versión exportada incluye 15 chequeos de sintaxis, assets, geometría, resortes, mapeo en espejo, brazos y ciclo de vida de cámara simulado. **Las pruebas con webcam real, renderizado WebGL, rendimiento móvil y compatibilidad de navegadores siguen pendientes en un dispositivo real.**

## Tecnologías y licencias

- Three.js 0.186.0, con licencia MIT incluida en `dist/vendor/THREE-LICENSE.txt`.
- MediaPipe Tasks Vision 0.10.32 y modelos de cuerpo/cara, con licencia Apache 2.0 incluida en `dist/tracking/MEDIAPIPE-LICENSE.txt`.
- Personajes y escenarios procedurales: no necesitas descargar modelos 3D externos.

Las licencias de terceros se incluyen en sus carpetas. Este paquete no concede una licencia general adicional para el código original o la marca Spatialgineers.

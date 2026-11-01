// Transness - Service Worker
// Estrategia: "red primero, caché de respaldo" para archivos propios.
// - Con conexión, siempre se carga la última versión.
// - Sin conexión, se usa la copia guardada.
// Firebase, Google Fonts, etc. (otros dominios) no se tocan.
// Al cambiar archivos importantes, sube el número de CACHE_VERSION.

const CACHE_VERSION = 'transness-v6';

const ARCHIVOS = [
  './',
  'index.html',
  'estilos.css',
  'app.js',
  'js/util.js',
  'js/datos.js',
  'js/registro.js',
  'recursos.json',
  'manifest.json',
  'logo_transness.png',
  'google_logo_icon_147282.png',
  'social_apple_mac_25.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // allSettled: si falta algún archivo, la instalación no falla entera
      Promise.allSettled(ARCHIVOS.map((archivo) => cache.add(archivo)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((c) => c !== CACHE_VERSION).map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return; // Firebase, fuentes, etc.

  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        if (respuesta.ok && respuesta.type === 'basic') {
          const copia = respuesta.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      })
      .catch(() =>
        caches.match(peticion).then((guardada) => guardada || caches.match('index.html'))
      )
  );
});
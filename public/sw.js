// ===== Service Worker — RestauranteWeb (PWA) =====
// Estrategias:
//  - Páginas HTML ........ red primero → copia guardada → página offline
//  - CSS / JS ............ red primero (304 rápido) → copia guardada sin señal
//  - Imágenes ............ copia guardada primero (máx. 120, las más viejas se borran)
//  - API pública (GET) ... red primero → última respuesta guardada (para ver datos sin señal)
//  - API privada / POST .. nunca se guarda (datos de sesión, paneles de admin)
const VERSION = 'v4';
const CACHE_CORE = `rw-core-${VERSION}`;
const CACHE_PAGES = `rw-pages-${VERSION}`;
const CACHE_ASSETS = `rw-assets-${VERSION}`;
const CACHE_IMAGES = `rw-images-${VERSION}`;
const CACHE_API = `rw-api-${VERSION}`;
const MAX_IMAGES = 120;
const MAX_PAGES = 40;
const MAX_API = 60;

const PRECACHE = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/css/style.css',
    '/css/responsive.css',
    '/css/ui-enhancements.css',
    '/js/utils.js',
    '/js/i18n.js',
    '/js/main.js',
    '/js/ui-enhancements.js',
    '/js/pwa.js',
    '/locales/es.json',
    '/icons/icon-192.png',
    '/icons/favicon.ico',
    '/images/PueblosMágicos.svg.png'
];

// Rutas de API públicas que vale la pena tener sin conexión
const API_PUBLICA = /^\/api\/(restaurants(\/[a-f0-9]{24}(\/(reviews|eventos))?)?|restaurants\?|tours|guias|agencias|noticias|eventos\/proximos|ofertas-flash\/activas|recomendaciones|ranking-admin\/public)/i;
// Nunca guardar paneles ni datos de sesión
const PRIVADO = /^\/api\/(auth|user|admin|super-admin|gobierno|itinerarios|crm|bolsa-trabajo\/(?!activas)|ranking-admin\/(?!public))|my-restaurant/i;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_CORE)
            // allSettled: si un archivo falla, el resto igual se guarda
            .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    const vigentes = [CACHE_CORE, CACHE_PAGES, CACHE_ASSETS, CACHE_IMAGES, CACHE_API];
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => !vigentes.includes(k)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Borra las entradas más viejas cuando un caché crece demasiado
async function recortar(nombre, max) {
    const cache = await caches.open(nombre);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

// Los archivos del precache viven en CACHE_CORE: actualizarlos ahí para que
// caches.match() no siga devolviendo la copia de la instalación
const RUTAS_CORE = new Set(PRECACHE.map((u) => new URL(u, self.location.origin).href));

async function guardar(nombre, request, response, max) {
    if (!response || (response.status !== 200 && response.type !== 'opaque')) return;
    const url = typeof request === 'string' ? new URL(request, self.location.origin).href : request.url;
    if (RUTAS_CORE.has(url)) { nombre = CACHE_CORE; max = 0; }
    const cache = await caches.open(nombre);
    await cache.put(request, response);
    if (max) recortar(nombre, max);
}

async function redPrimero(request, nombre, max, fallback) {
    try {
        const resp = await fetch(request);
        if (resp.ok) guardar(nombre, request, resp.clone(), max);
        return resp;
    } catch (e) {
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) return cached;
        if (fallback) return fallback();
        throw e;
    }
}

async function cachePrimero(request, nombre, max) {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    const resp = await fetch(request);
    guardar(nombre, request, resp.clone(), max);
    return resp;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    if (request.headers.get('Authorization')) return; // peticiones con sesión: siempre a la red

    const url = new URL(request.url);
    const mismoOrigen = url.origin === self.location.origin;

    // Fuentes y librerías de CDN (no cambian): caché primero
    if (!mismoOrigen) {
        if (/(fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname)) {
            event.respondWith(cachePrimero(request, CACHE_ASSETS));
        }
        return;
    }

    // Navegación entre páginas
    if (request.mode === 'navigate') {
        event.respondWith(redPrimero(request, CACHE_PAGES, MAX_PAGES, () => caches.match('/offline.html')));
        return;
    }

    // Imágenes (incluye el proxy de Cloudinary)
    if (url.pathname.startsWith('/api/img-proxy') || request.destination === 'image') {
        event.respondWith(cachePrimero(request, CACHE_IMAGES, MAX_IMAGES).catch(() => caches.match('/icons/icon-192.png')));
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        const ruta = url.pathname + url.search;
        if (!PRIVADO.test(ruta) && API_PUBLICA.test(ruta)) {
            event.respondWith(redPrimero(request, CACHE_API, MAX_API));
        }
        return; // el resto de la API: comportamiento normal del navegador
    }

    // CSS, JS, traducciones, manifest
    if (['style', 'script', 'manifest'].includes(request.destination) || /\.(css|js|json)$/.test(url.pathname)) {
        event.respondWith(redPrimero(request, CACHE_ASSETS));
    }
});

// Permite que la página pida activar una versión nueva al instante
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

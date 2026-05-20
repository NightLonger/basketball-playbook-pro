// Service Worker для Basketball Playbook v2.0
const CACHE_NAME = 'basketball-playbook-v2';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/modules/config.js',
    './js/modules/court.js',
    './js/modules/players.js',
    './js/modules/drawing.js',
    './js/modules/history.js',
    './js/modules/touch.js',
    './js/modules/storage.js',
    './js/modules/playbook.js',
    './manifest.json'
];

// Установка SW - кэшируем все ассеты
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('🏀 SW: Caching assets');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Активация - чистим старые кэши
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('🏀 SW: Deleting old cache', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Стратегия: Network First с fallback на кэш
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Если успешно - кэшируем и возвращаем
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Если сеть недоступна - пробуем из кэша
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // Если нет в кэше - возвращаем index.html для SPA
                    return caches.match('./index.html');
                });
            })
    );
});
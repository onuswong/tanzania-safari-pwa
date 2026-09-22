const CACHE_NAME = 'safari-cache-v4';

// 只預先快取本機檔案，避免 CDN 重新導向導致安裝崩潰
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(PRECACHE_URLS))
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse; // 離線直接提取
            }
            return fetch(event.request).then(networkResponse => {
                // 放寬條件：允許 status === 0 (跨域資源如 CDN, Unsplash) 被快取
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0) || networkResponse.type === 'error' || !event.request.url.startsWith('http')) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                console.log('已完全離線:', event.request.url);
            });
        })
    );
});

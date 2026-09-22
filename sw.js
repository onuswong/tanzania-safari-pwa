const CACHE_NAME = 'safari-cache-v3';

// 核心必備檔案：必須在安裝階段就強制下載並快取
const PRECACHE_URLS = [
    '/',
    '/index.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest'
];

// 1. 安裝階段：強制預先快取核心檔案
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(PRECACHE_URLS))
        .then(() => self.skipWaiting())
    );
});

// 2. 啟動階段：清除舊版快取，確保拿到最新代碼
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// 3. 攔截請求階段：Cache-First 策略
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // 如果快取金庫有，離線直接秒回傳
            if (cachedResponse) {
                return cachedResponse;
            }
            // 如果沒有，向網路請求並動態存入快取 (例如動物圖片)
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error' || !event.request.url.startsWith('http')) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                console.log('已完全離線，且快取中找不到資源:', event.request.url);
            });
        })
    );
});

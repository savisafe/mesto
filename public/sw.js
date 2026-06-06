/* Service worker для Mesto CRM (PWA).
 *
 * Безопасность мультитенантности: НЕ кэшируем ответы API и HTML
 * авторизованных страниц — иначе данные одного бизнеса/пользователя
 * могли бы утечь другому на общем устройстве. Кэшируем только
 * статические ассеты с контент-хэшем (_next/static, иконки) и
 * отдаём оффлайн-страницу, когда сети нет.
 */

const VERSION = 'v1';
const STATIC_CACHE = `mesto-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

const isStaticAsset = (url) =>
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp|ico)$/.test(url.pathname);

// Stale-while-revalidate для неизменяемых статических ассетов.
const staleWhileRevalidate = async (request) => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => cached);
    return cached || network;
};

// Навигации: сеть в приоритете, оффлайн-страница как запасной вариант.
const networkFirstNavigation = async (request) => {
    try {
        return await fetch(request);
    } catch {
        const cache = await caches.open(STATIC_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return offline || Response.error();
    }
};

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Только свой origin; внешние запросы и API не трогаем.
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(request));
        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});

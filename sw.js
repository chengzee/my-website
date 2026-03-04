/* ============================
   Service Worker — Cache-First 策略
   快取 CSS / JS / 縮圖，提升載入速度
   ============================ */
const CACHE_NAME = 'catsite-v1';
const PRECACHE_URLS = [
  '/',
  '/homepage.html',
  '/photo-gallery.html',
  '/cats.html',
  '/cat-diary.html',
  '/articles.html',
  '/about.html',
  '/css/style.css',
  '/js/common.js',
  '/js/components.js',
  '/js/hero.js',
  '/js/gallery.js',
  '/js/cats.js',
  '/js/diary.js',
  '/js/vendor/chart.umd.min.js',
  '/images/favicon.png',
];

// 安裝：預快取核心資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 啟動：清除舊版快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 攔截：Cache-First（靜態資源），Network-First（HTML / JSON）
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 只處理同源請求
  if (url.origin !== location.origin) return;

  // HTML / JSON 用 Network-First
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 縮圖 / CSS / JS / 圖片 用 Cache-First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 只快取成功的回應 & 圖片/CSS/JS
        if (response.ok && (
          url.pathname.startsWith('/photos/_thumbnails/') ||
          url.pathname.startsWith('/photos/_hero/') ||
          url.pathname.startsWith('/photos/_cards/') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg')
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

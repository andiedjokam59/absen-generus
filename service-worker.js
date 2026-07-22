const CACHE_NAME = 'presensi-iq-v4'; // <-- NAIKKAN VERSI INI SETIAP KALI UPDATE FITUR
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './Logo remaja daerah.png',
  // Library CDN di-cache agar bisa dipanggil saat offline murni:
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Inter:wght=400;500;600;700&display=swap'
];

// 1. Install & langsung aktifkan Service Worker baru
self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa SW baru menggantikan SW lama tanpa menunggu browser ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Aktivasi & bersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Langsung ambil alih semua tab terbuka
  );
});

// 3. Strategi Fetch: Network-First dengan Cache Fallback
self.addEventListener('fetch', event => {
  // Abaikan request API Supabase / POST request dari penanganan cache
  if (event.request.url.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jika berhasil mengambil versi terbaru dari jaringan, perbarui cache secara dinamis
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline atau jaringan gagal, ambil dari cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
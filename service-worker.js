// Service Worker Fully-Offline Capable (Versi v2)
const CACHE_NAME = 'presensi-offline-v2';

// Daftar file internal & CDN eksternal yang WAJIB disimpan agar bisa offline total
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Logo remaja daerah.png',
  './manifest.json',
  // Library Eksternal
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// 1. Install Event: Simpan aset ke cache lokal
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => cache.add(asset))
      );
    })
  );
});

// 2. Activate Event: Hapus cache versi lama (v1) & langsung aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Ambil dari Cache jika Offline, atau Jaringan jika Online
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Abaikan request langsung ke Supabase agar ditangani oleh logika di index.html
  if (url.origin.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
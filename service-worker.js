// Service Worker Fully-Offline Capable
const CACHE_NAME = 'presensi-offline-v1';

// Daftar semua file internal dan CDN eksternal yang WAJIB disimpan agar bisa offline total
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Logo remaja daerah.png',
  './manifest.json',
  // Library Eksternal (Agar fitur QR Scanner & Supabase tetap jalan saat offline)
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// 1. Install Event: Download dan simpan semua aset ke dalam cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Menggunakan Promise.allSettled agar jika salah satu CDN gagal, file lokal tetap ter-cache
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => cache.add(asset))
      );
    })
  );
});

// 2. Activate Event: Hapus cache versi lama & ambil alih kontrol langsung
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

// 3. Fetch Event: Cache-First dengan Fallback ke Network
// Jika offline, ambil dari Cache. Jika online, ambil dari server sambil memperbarui Cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Abaikan request langsung ke database Supabase agar tidak bentrok dengan logika offline Supabase di HTML
  if (url.origin.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Jika ada di cache, tampilkan langsung (sehingga logo & aplikasi langsung muncul walau offline)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Abaikan error jaringan saat offline */});

        return cachedResponse;
      }

      // Jika belum ada di cache, ambil dari jaringan
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback untuk navigasi utama jika offline total
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
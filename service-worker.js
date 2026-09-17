// Service Worker Offline-First dengan Pembaruan Otomatis Real-Time

const CACHE_NAME = 'presensi-app-shell';

// Berkas-berkas inti agar aplikasi bisa dibuka dari awal tanpa internet
const ASSETS = [
  './',
  './index tema putih.html',
  './Logo remaja daerah.png',
  './manifest.json'
];

// 1. Install: Simpan berkas dasar ke memori lokal HP/Laptop
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Activate: Langsung ambil alih koneksi tanpa menunggu
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

// 3. Fetch: Prioritaskan Sinyal (Network First) untuk Data Terbaru, Fallback ke Cache jika Offline Total
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Jangan simpan response API Supabase/External CDN ke dalam App Shell Cache
  const url = new URL(event.request.url);
  const isExternalApi = url.origin.includes('supabase.co');

  if (isExternalApi) {
    // Biarkan Supabase ditangani oleh logika JavaScript offline di halaman HTML
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika ada internet, perbarui salinan cache lokal secara otomatis
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika TIDAK ADA SINYAL SAMA SEKALI, ambil tampilan dari memori cache lokal
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika membuka halaman utama saat offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index tema putih.html');
          }
        });
      })
  );
});
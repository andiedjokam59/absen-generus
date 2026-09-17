// Service Worker Auto-Update (Tanpa Perlu Ganti Versi Manual)
const CACHE_NAME = 'presensi-app-cache-v1';

// Aset statis awal yang di-cache saat install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Logo remaja daerah.png',
  './manifest.json',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// 1. Install Event: Simpan aset awal dan langsung aktifkan
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Memaksa service worker baru langsung mengambil alih
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => cache.add(asset))
      );
    })
  );
});

// 2. Activate Event: Klaim kontrol terhadap semua tab/halaman yang terbuka
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim()
  );
});

// 3. Fetch Event: Strategi Network-First untuk File Aplikasi (Selalu Ambil Versi Terbaru dari Server)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Abaikan request langsung ke Supabase (ditangani oleh logika JS di index.html)
  if (url.origin.includes('supabase.co')) {
    return;
  }

  // STRATEGI NETWORK-FIRST
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' }) // Mengabaikan cache browser agar selalu minta data terbaru ke GitHub
      .then((networkResponse) => {
        // Jika berhasil ambil dari server, perbarui cache lokal secara otomatis
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika OFFLINE (Gagal koneksi ke server), ambil dari cache lokal
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika tidak ada di cache dan ini navigasi halaman utama, buka index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
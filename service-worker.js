// Service Worker Otomatis Real-Time (Tanpa Harus Mengubah Versi Manual)

// 1. Install Event: Langsung aktif tanpa antre/menunggu
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate Event: Langsung ambil alih semua halaman yang terbuka
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Hapus seluruh cache lama secara otomatis setiap kali Service Worker aktif
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: Strategi Network-First / Network-Only
// Mengambil langsung dari GitHub/Server terlebih dahulu agar selalu detik itu juga ter-update
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }) // Paksa mengambil data segar tanpa cache browser
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        // Jika benar-benar offline (tidak ada internet), ambil fallback dari cache jika ada
        return caches.match(event.request);
      })
  );
});
// Nama penyimpanan cache lokal
const CACHE_NAME = 'dapohub-cache-v2';

// Daftar aset statis yang wajib disimpan untuk penggunaan luring (offline)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

// Tahap Instalasi: Menyimpan aset-aset utama ke dalam cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Menyimpan aset utama ke cache luring...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Tahap Aktivasi: Membersihkan cache lama jika ada pembaruan versi
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache usang:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Tahap Fetch: Mengambil data dari cache jika offline, atau meminta ke internet jika online
self.addEventListener('fetch', (event) => {
  // Hanya proses permintaan metode GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Jika ada di cache, gunakan cache tersebut
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, lakukan request jaringan normal
        return fetch(event.request)
          .then((response) => {
            // Jika respons tidak valid, segera kembalikan
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Klon respons untuk disimpan ke cache secara dinamis
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Jangan simpan request dari skema pihak ketiga yang dinamis jika tidak diperlukan
                if (event.request.url.startsWith(window.location.origin)) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Jika gagal mendapatkan jaringan dan cache (benar-benar offline)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
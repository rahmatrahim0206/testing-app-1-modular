  const CACHE_NAME = 'dapohub-cache-v3';
        const ASSETS_TO_CACHE = ['./', './index.html', './manifest.json'];
        self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE))));
        self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))));
        self.addEventListener('fetch', (e) => {
          if (!e.request.url.startsWith('http')) return;
          e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html'))));
        });
      

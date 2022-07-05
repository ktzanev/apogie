// Choose a cache name
const cacheName = 'apogie-v13';
// List the files to precache
const precacheResources = [
  '/apogie/index.html',
  '/apogie/lisezmoi.js',
  '/apogie/main.css',
  '/apogie/main.js',
  'images/apogie.svg',
  'images/apogie72.png',
  'images/apogie96.png',
  'images/apogie128.png',
  'images/apogie192.png',
  'images/apogie384.png',
  'images/apogie512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.3/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.8.3/font/bootstrap-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/vue/2.5.22/vue.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.0/jszip.min.js',
];

// When the service worker is installing, open the cache and add the precache resources to it
self.addEventListener('install', (event) => {
  console.log('Service worker install event!');
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(precacheResources)));
});

// clear old caches when the service worker is activated
self.addEventListener('activate', (event) => {
  console.log('Service worker activate event!');
  event.waitUntil(
    caches.keys().then(function(allCaches) {
      return Promise.all(
        allCaches.filter(function(name) {
          return name != cacheName
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
});

// When there's an incoming fetch request, try and respond with a precached resource, otherwise fall back to the network
self.addEventListener('fetch', (event) => {
  console.log('Fetch intercepted for:', event.request.url);
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache first strategy
      return cachedResponse || fetch(event.request);
    }),
  );
});

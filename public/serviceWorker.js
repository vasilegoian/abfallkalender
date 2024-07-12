// public/serviceWorker.js

const CACHE_NAME = 'trash-pickup-cache-v2';

self.addEventListener('install', event => {
  console.log('Service Worker installing.');

  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const manifestResponse = await fetch('/asset-manifest.json');
      const manifest = await manifestResponse.json();
      const urlsToCache = [
        '/',
        '/recycling-truck.png',
        '/Blau.svg',
        '/Braun.svg',
        '/Gelb.svg',
        '/Grün.svg',
        '/Schwarz.svg',
        '/trash-pickup-dates.json',
        '/trash-bin.png',
        '/manifest.json',
        '/icons/recycling-truck-16.png',
        '/icons/recycling-truck-24.png',
        '/icons/recycling-truck-32.png',
        '/icons/recycling-truck-48.png',
        '/icons/recycling-truck-64.png',
        '/icons/recycling-truck-128.png',
        '/icons/recycling-truck-512.png',
        '/icons/screenshot-mobile.png',
        '/icons/screenshot-desktop.png',
        ...Object.values(manifest.files)
      ];
      await cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});

// Notification event handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated');

  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('push', event => {
  const notificationData = event.data.json();

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    data: {
      url: notificationData.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});


// service-worker.js
const CACHE_NAME = 'math-classes-v2';
const urlsToCache = [
  '/Mithilesh-/',
  '/Mithilesh-/index.html',
  '/Mithilesh-/manifest.json',
  // External resources
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap',
  // Icons
  'https://img.icons8.com/fluency/48/math.png',
  'https://img.icons8.com/fluency/72/math.png',
  'https://img.icons8.com/fluency/96/math.png',
  'https://img.icons8.com/fluency/144/math.png',
  'https://img.icons8.com/fluency/192/math.png',
  'https://img.icons8.com/fluency/512/math.png',
  // Fallback teacher image
  'https://ui-avatars.com/api/?name=Mr+Mithilesh&background=4f46e5&color=fff&size=200'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://cdnjs.cloudflare.com') &&
      !event.request.url.startsWith('https://fonts.googleapis.com') &&
      !event.request.url.startsWith('https://img.icons8.com') &&
      !event.request.url.startsWith('https://ui-avatars.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache PUT, POST, DELETE requests
                if (event.request.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        ).catch(error => {
          console.log('Service Worker: Fetch failed; returning offline page', error);
          // For HTML requests, return the cached index.html
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/Mithilesh-/index.html');
          }
          // For other requests, return a fallback
          return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  if (event.tag === 'sync-feedback') {
    event.waitUntil(syncFeedback());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  
  const title = 'Math Classes';
  const options = {
    body: 'New updates available!',
    icon: 'https://img.icons8.com/fluency/96/math.png',
    badge: 'https://img.icons8.com/fluency/48/math.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/Mithilesh-/');
      }
    })
  );
});

// Helper function for background sync
function syncFeedback() {
  // This would sync any pending feedback submissions
  // For now, just a placeholder
  return Promise.resolve();
                      }

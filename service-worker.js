const CACHE_NAME = 'math-classes-v3'; // Changed from v2 to v3
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
  // Teacher images (both GitHub and fallback)
  'https://raw.githubusercontent.com/Satqm/Mithilesh-/main/Mithilesh.jpg',
  'https://ui-avatars.com/api/?name=Mr+Mithilesh&background=4f46e5&color=fff&size=200',
  // WhatsApp icons for admission feature
  'https://img.icons8.com/fluency/48/whatsapp.png',
  'https://img.icons8.com/fluency/96/whatsapp.png',
  'https://img.icons8.com/fluency/144/whatsapp.png'
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
    }).then(() => {
      // Claim clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebaseio.com')) {
    // For Firebase requests, always try network first
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return offline response for API failures
          return new Response(JSON.stringify({
            error: 'You are offline. Please check your connection.'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // For other requests, use cache-first strategy
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
          
          // For image requests, return a placeholder
          if (event.request.headers.get('accept').includes('image')) {
            if (event.request.url.includes('Mithilesh.jpg')) {
              return caches.match('https://ui-avatars.com/api/?name=Mr+Mithilesh&background=4f46e5&color=fff&size=200');
            }
            return caches.match('https://img.icons8.com/fluency/96/math.png');
          }
          
          // For other requests, return a fallback
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Offline - Math Classes</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }
                  h1 { font-size: 48px; margin-bottom: 20px; }
                  p { font-size: 18px; margin-bottom: 30px; }
                  .icon { font-size: 100px; margin-bottom: 30px; }
                </style>
              </head>
              <body>
                <div class="icon">📶</div>
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <p>The Math Classes app requires internet connection to load data.</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: white; color: #667eea; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                  Try Again
                </button>
              </body>
            </html>
          `, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
  );
});

// Background sync for offline data submission
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'sync-feedback') {
    event.waitUntil(syncFeedback());
  }
  
  if (event.tag === 'sync-admission') {
    event.waitUntil(syncAdmissionInquiries());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  
  let data = {
    title: 'Math Classes',
    body: 'New updates available!',
    icon: 'https://img.icons8.com/fluency/96/math.png',
    badge: 'https://img.icons8.com/fluency/48/math.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/Mithilesh-/'
    }
  };
  
  if (event.data) {
    try {
      data = { ...data, ...JSON.parse(event.data.text()) };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate,
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes('/Mithilesh-/') && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/Mithilesh-/');
        }
      })
  );
});

// Handle app installation
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('Service Worker: Before install prompt');
  // You can store the event and trigger it later
  // This is handled in the main app code
});

// Helper functions for background sync
function syncFeedback() {
  // Get pending feedback from IndexedDB
  return getPendingData('feedback').then(pendingFeedback => {
    return Promise.all(
      pendingFeedback.map(feedback => {
        return fetch('https://firestore.googleapis.com/v1/projects/math-classes-by-mithilesh/databases/(default)/documents/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAuthToken() // This would need to be implemented
          },
          body: JSON.stringify(feedback)
        })
        .then(response => {
          if (response.ok) {
            // Remove from pending
            return removePendingData('feedback', feedback.id);
          }
          throw new Error('Failed to sync feedback');
        });
      })
    );
  });
}

function syncAdmissionInquiries() {
  // Get pending admission inquiries from IndexedDB
  return getPendingData('admissionInquiries').then(pendingInquiries => {
    return Promise.all(
      pendingInquiries.map(inquiry => {
        return fetch('https://firestore.googleapis.com/v1/projects/math-classes-by-mithilesh/databases/(default)/documents/admissionInquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAuthToken() // This would need to be implemented
          },
          body: JSON.stringify(inquiry)
        })
        .then(response => {
          if (response.ok) {
            // Remove from pending
            return removePendingData('admissionInquiries', inquiry.id);
          }
          throw new Error('Failed to sync admission inquiry');
        });
      })
    );
  });
}

// IndexedDB helper functions (simplified)
function getPendingData(storeName) {
  // This is a simplified version
  // In a real app, you would use IndexedDB
  return Promise.resolve([]);
}

function removePendingData(storeName, id) {
  return Promise.resolve();
}

function getAuthToken() {
  // This would need to be implemented to get the current user's auth token
  return null;
}

// Periodic sync for background updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

function updateContent() {
  console.log('Service Worker: Periodic sync for content update');
  // Fetch latest data and update cache
  return Promise.resolve();
              }

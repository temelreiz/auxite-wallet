/**
 * Push Notification Service Worker
 * Bu dosyayı public/sw.js olarak kaydet
 */

// Service Worker Version
const SW_VERSION = '1.0.0';

// Cache name
const CACHE_NAME = `auxite-cache-v${SW_VERSION}`;

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + SW_VERSION);
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + SW_VERSION);
  event.waitUntil(clients.claim());
});

// Push event - Bildirim geldiğinde
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Auxite Wallet',
    body: 'Yeni bildiriminiz var',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {},
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/wallet';

  // Bildirim tipine göre yönlendir
  switch (data.type) {
    case 'transaction':
      targetUrl = '/wallet?tab=history';
      break;
    case 'price_alert':
      targetUrl = '/?alert=' + data.alertId;
      break;
    case 'security':
      targetUrl = '/wallet?security=true';
      break;
    case 'deposit':
      targetUrl = '/wallet?deposit=true';
      break;
    default:
      targetUrl = data.url || '/wallet';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Açık pencere varsa ona odaklan
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background sync (opsiyonel)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Offline'da biriken bildirimleri senkronize et
  console.log('[SW] Syncing notifications...');
}

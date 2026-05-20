const CACHE_NAME = 'control-viajes-v1';

const RUTAS_ESTATICAS = [
  '/',
  '/login',
  '/checador',
  '/residente',
  '/manifest.json',
];

// Instalar — cachear rutas principales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RUTAS_ESTATICAS).catch(() => {
        // Ignorar si alguna ruta no está disponible durante install
      });
    })
  );
  self.skipWaiting();
});

// Activar — limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first para páginas, cache-first para assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No cachear llamadas a Supabase ni a la API
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Assets estáticos: cache-first
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'font' ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Páginas: network-first con fallback al caché
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }
});

// Notificaciones push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Control Viajes';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.viajeId || 'viaje',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'ver', title: 'Ver viaje' },
      { action: 'cerrar', title: 'Cerrar' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'cerrar') return;

  const url = event.notification.data?.url || '/residente';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Buscar ventana ya abierta
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Abrir nueva ventana
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

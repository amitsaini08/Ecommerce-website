self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.some((c) => c.visibilityState === 'visible')) return;

      return self.registration.showNotification(data.title || 'NovaHub', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { link: data.link || '/' },
        tag: data.id,
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(link);
          return c.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
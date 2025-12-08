// Service Worker para Push Notifications
// Este arquivo lida com notificações push mesmo quando o navegador está fechado

// Evento de instalação do service worker
self.addEventListener('install', (event) => {
  console.log('[SW Push] Service Worker instalado');
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', (event) => {
  console.log('[SW Push] Service Worker ativado');
  event.waitUntil(clients.claim());
});

// Evento de recebimento de push notification
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push recebido:', event);
  
  let notificationData = {
    title: 'BlackRock Broker',
    body: 'Você tem uma nova notificação!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'blackrock-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: '/'
    }
  };
  
  // Tentar parsear os dados do push
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: {
          url: payload.url || '/',
          ...payload.data
        }
      };
    } catch (e) {
      // Se não for JSON, usar o texto diretamente
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }
  
  // Mostrar a notificação
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      renotify: notificationData.renotify,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'Abrir'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    })
  );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notificação clicada:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  // Verificar a ação
  if (event.action === 'close') {
    return;
  }
  
  // Abrir ou focar na janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Verificar se já existe uma janela aberta
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        
        // Se não existe, abrir uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Evento de fechamento da notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notificação fechada:', event);
});

// Evento de push subscription change (renovação automática)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Push] Subscription mudou:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((subscription) => {
      // Enviar nova subscription para o servidor
      return fetch('/api/push-subscription-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldEndpoint: event.oldSubscription?.endpoint,
          newSubscription: subscription.toJSON()
        })
      });
    })
  );
});

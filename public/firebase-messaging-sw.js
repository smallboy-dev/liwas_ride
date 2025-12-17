// Firebase Messaging Service Worker
// Handles background notifications when the app is closed
// This file is auto-generated at build time

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAQaGVCKQ6W7rOm0UlrFjV4pRCcgNJoQzU",
  authDomain: "liwas-793a1.firebaseapp.com",
  projectId: "liwas-793a1",
  storageBucket: "liwas-793a1.firebasestorage.app",
  messagingSenderId: "578255787212",
  appId: "1:578255787212:web:d30235aa9107c13cbf9e69",
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data || {},
    tag: 'notification',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

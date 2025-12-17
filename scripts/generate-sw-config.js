/**
 * Generate Firebase config for service worker
 * This script runs at build time to inject Firebase config into the service worker
 */

const fs = require('fs');
const path = require('path');

// Get environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAQaGVCKQ6W7rOm0UlrFjV4pRCcgNJoQzU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "liwas-793a1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "liwas-793a1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "liwas-793a1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "578255787212",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:578255787212:web:d30235aa9107c13cbf9e69",
};

// Generate service worker content
const swContent = `// Firebase Messaging Service Worker
// Handles background notifications when the app is closed
// This file is auto-generated at build time

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "${firebaseConfig.apiKey}",
  authDomain: "${firebaseConfig.authDomain}",
  projectId: "${firebaseConfig.projectId}",
  storageBucket: "${firebaseConfig.storageBucket}",
  messagingSenderId: "${firebaseConfig.messagingSenderId}",
  appId: "${firebaseConfig.appId}",
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
`;

// Write to public folder
const swPath = path.join(__dirname, '../public/firebase-messaging-sw.js');
fs.writeFileSync(swPath, swContent);

console.log('✓ Service worker config generated at', swPath);

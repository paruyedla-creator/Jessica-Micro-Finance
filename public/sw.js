self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('App is ready for offline use');
});

self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request).catch(() => console.log('Network Error')));
});
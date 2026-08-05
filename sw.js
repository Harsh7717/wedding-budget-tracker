/* Wedding Budget Tracker — service worker (offline cache) */
var CACHE = 'wbt-v10';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isAppShell(req){
  // the HTML document + core code should always be fresh when online
  if(req.mode === 'navigate') return true;
  var u = req.url;
  return u.indexOf('/index.html') >= 0 ||
         u.indexOf('/manifest.webmanifest') >= 0 ||
         u.replace(self.location.origin,'').replace(/\?.*$/,'').match(/\/$/);
}

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  // Network-first for the app shell → users always get the latest version,
  // fall back to cache only when offline. No manual versioning needed.
  if(isAppShell(e.request)){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.status===200 && e.request.url.indexOf(self.location.origin)===0){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(c){
          return c || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Cache-first for static assets (icons etc.)
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(res){
        if(res && res.status===200 && e.request.url.indexOf(self.location.origin)===0){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});

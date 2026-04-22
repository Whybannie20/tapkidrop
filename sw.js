const CACHE='tapkidrop-v1';const STATIC=['/','/index.html','/css/style.css','/js/app.js','/manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.url.includes('supabase')||e.request.url.includes('telegram.org')){e.respondWith(fetch(e.request).catch(()=>new Response('Offline',{status:503})));return}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok){const c=n.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c))}return n}).catch(()=>caches.match('/index.html'))))});

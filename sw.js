const CACHE='tiny-royals-v1';
const SHELL=['/','/index.html','/style.css','/app.js','/scene.js','/motion.js','/camera.js','/icon.svg','/fonts/space-grotesk.woff2','/vendor/three.module.js','/vendor/three.core.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!(/\.(js|wasm|task|woff2|svg|css)$/.test(url.pathname)||url.pathname==='/'||url.pathname==='/index.html'))return;
  // Only application assets are cached. Camera frames never enter this path.
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;}).catch(()=>caches.match(event.request)));
});

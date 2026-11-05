/* Mi Finanzas · local-only offline cache. No financial data is stored in Cache Storage. */
const CACHE='mi-finanzas-static-v2';
const files=['./','./index.html','./styles.css','./favicon.svg','./manifest.webmanifest','./assets/app.js','./assets/views.js','./assets/store.js','./assets/finance.js','./assets/models.js','./assets/demo.js','./assets/xlsx.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('mi-finanzas-static-')&&name!==CACHE).map(name=>caches.delete(name)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(request).then(response=>{if(response.ok&&new URL(request.url).pathname.startsWith(new URL('./',self.registration.scope).pathname)){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response}).catch(async()=>await caches.match(request)||await caches.match('./index.html')));
});

/* Inregelaar Ventilatie — offline cache
   The page itself (index.html, manifest) comes from the network first, so an update is used at the next start with internet;
   without internet (or after 4 s without an answer) the saved copy opens. Scripts and icons: saved copy first, refreshed in the background. */
const CACHE = 'inregelaar-v29';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const save = (req, res) => { if (res && res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; };
function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false; const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const saved = () => caches.match(req, { ignoreSearch: true }).then((h) => h || caches.match('index.html'));
    const timer = setTimeout(() => saved().then(finish), 4000);
    fetch(req).then((res) => { clearTimeout(timer); finish(save(req, res)); })
      .catch(() => { clearTimeout(timer); saved().then((h) => finish(h || Response.error())); });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const page = req.mode === 'navigate' || /\/$|\/index\.html$|\.webmanifest$/.test(url.pathname);
    if (page) { e.respondWith(networkFirst(req)); return; }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => save(req, res)).catch(() => hit);
      return hit || net;
    }));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return res; })));
  }
});

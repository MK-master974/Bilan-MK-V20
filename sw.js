/* Hors connexion : l'application est gardée en cache. Les dossiers des patients ne passent jamais par ici. */
const CACHE = 'evalys-v20';
const KEEP = ['evalys-moteurs', 'transformers-cache'];
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  /* les moteurs et les modèles téléchargés (transcription, lecture de texte) sont gardés d'une version à l'autre */
  /* le domaine github.io est partagé avec tes autres sites : on ne supprime que les anciens caches d'Évalys */
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith('pbk-') || (k.startsWith('evalys-v') && !k.startsWith(CACHE))) && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    /* toujours redemander la page au serveur (version en ligne), le cache ne sert que hors connexion */
    e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  if (u.origin === location.origin) { e.respondWith(caches.match(r).then(m => m || fetch(r))); return; }
  /* moteurs de transcription et de lecture (versions figées) : gardés en cache pour le hors connexion */
  if (u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open('evalys-moteurs').then(c => c.match(r).then(m => m || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(CACHE + '-polices').then(c => c.match(r).then(m => m || fetch(r).then(res => { c.put(r, res.clone()); return res; }))));
  }
});

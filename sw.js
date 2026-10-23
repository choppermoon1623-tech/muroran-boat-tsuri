// 室蘭ボート釣りナビ：圏外でも使えるようにキャッシュする
const APP = 'mbt-app-v2', TILES = 'mbt-tiles', API = 'mbt-api';
const SHELL = ['./', 'index.html', 'tide-data.js', 'manifest.webmanifest', 'icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
const TILE_HOSTS = ['cyberjapandata.gsi.go.jp', 'server.arcgisonline.com', 'tiles.openseamap.org', 'tile.openstreetmap.org', 'wms.gebco.net'];
const MAX_TILES = 4000;

self.addEventListener('install', e => e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('mbt-app-') && k !== APP).map(k => caches.delete(k)))).then(() => self.clients.claim())));

async function trim(cache){
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (TILE_HOSTS.includes(u.hostname)){
    // 地図タイル：保存済みを先に使う
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === 'opaque'){ c.put(e.request, r.clone()); if (Math.random() < .02) trim(c); }
      return r;
    }));
  } else if (u.hostname.endsWith('open-meteo.com') || u.hostname === 'api.msil.go.jp'){
    // 予報・海しる：通信を優先し、圏外なら最後に取れたもの
    e.respondWith(fetch(e.request).then(r => { const cl = r.clone(); caches.open(API).then(c => c.put(e.request, cl)); return r; }).catch(() => caches.match(e.request)));
  } else {
    // アプリ本体：通信優先、圏外ならキャッシュ
    e.respondWith(fetch(e.request).then(r => { if (r.ok && (u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com')){ const cl = r.clone(); caches.open(APP).then(c => c.put(e.request, cl)); } return r; }).catch(() => caches.match(e.request, {ignoreSearch:true})));
  }
});

// 室蘭ボート釣りナビ：圏外でも使えるようにキャッシュする
const APP = 'mbt-app-v17', TILES = 'mbt-tiles', API = 'mbt-api';
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
// 応答が遅すぎるときは打ち切る（弱い電波で待ち続けない）
function timed(p, ms){ return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
// 取得した時刻を付けて保存し、圏外で保存分を返すときは「保存分」と分かるようにする
async function stamp(r, extra){
  const h = new Headers(r.headers);
  Object.entries(extra).forEach(([k, v]) => h.set(k, v));
  return new Response(await r.blob(), {status:r.status, statusText:r.statusText, headers:h});
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (TILE_HOSTS.includes(u.hostname)){
    // 地図タイル：保存済みを先に使う
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request);
      // 保存が終わるまで Worker を止めない
      if (r.ok || r.type === 'opaque') e.waitUntil(c.put(e.request, r.clone()).then(() => Math.random() < .02 ? trim(c) : null).catch(() => {}));
      return r;
    }));
  } else if (u.hostname.endsWith('open-meteo.com') || u.hostname === 'api.msil.go.jp'){
    // 予報・海しる：通信を優先し、圏外なら最後に取れたもの（取得時刻つき）
    e.respondWith((async () => {
      try{
        const r = await timed(fetch(e.request), u.hostname === 'api.msil.go.jp' ? 20000 : 12000);
        if (r.ok){ const s = await stamp(r, {'x-fetched-at': String(Date.now())}); e.waitUntil(caches.open(API).then(c => c.put(e.request, s.clone())).catch(() => {})); return s; }
        // サーバーの不調（500など）でも、保存分があればそちらを返す
        const hit = await caches.match(e.request);
        return hit ? stamp(hit, {'x-from-cache': '1'}) : r;
      }catch(err){
        const hit = await caches.match(e.request);
        if (!hit) throw err;
        return stamp(hit, {'x-from-cache': '1'});
      }
    })());
  } else {
    // アプリ本体：保存分があればすぐそれを出し、裏で新しい版を取っておく（次に開いた時に反映）
    e.respondWith((async () => {
      const hit = await caches.match(e.request, {ignoreSearch:true});
      const net = fetch(e.request).then(async r => { if (r.ok && (u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com')){ const c = await caches.open(APP); await c.put(e.request, r.clone()).catch(() => {}); } return r; });
      if (hit){ e.waitUntil(net.catch(() => {})); return hit; }
      const r = await timed(net, 15000); e.waitUntil(Promise.resolve()); return r;
    })());
  }
});

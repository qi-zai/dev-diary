/* 户主电话簿 Service Worker —— 全量离线缓存。
   改了 app.js / pinyin.js / index.html 之后，把下面的 VER 和 index.html 里的 ?v= 改成同一串新值（8 位即可），
   旧缓存会随版本号变化自动清掉，手机刷新就是新版 */
const VER = '4cff9666';
const CACHE = 'huzhu-phonebook-' + VER;
const CORE = [
  './',
  './index.html',
  './app.js?v=' + VER,
  './pinyin.js?v=' + VER,
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 页面本身：先走网络，断网才回缓存 —— 保证改了版本手机刷新就能看到，不会卡在旧界面 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || Response.error()))
    );
    return;
  }

  /* 静态资源：先出缓存，后台悄悄拉新的 */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => {
        if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

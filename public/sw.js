/* Service worker do José Planeja (PWA).
   Estratégia:
   - Navegações (HTML) → network-first, com fallback ao index em cache (offline).
   - Assets estáticos (JS/CSS/fontes/imagens) → cache-first (hash no nome garante
     que um novo deploy busca o arquivo novo; caches antigos são limpos no activate).
   - Requisições de API (/api, /auth) e de outras origens → nunca são cacheadas.
   Bump CACHE ao mudar a lógica deste arquivo. */
const CACHE = "jose-planeja-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // API cross-origin no dev, extensões, etc.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return; // dados sempre da rede

  // HTML / navegação → rede primeiro, cai para o app-shell em cache quando offline.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/index.html", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match("/index.html")) || Response.error();
      }
    })());
    return;
  }

  // Demais assets (mesma origem) → cache-first com preenchimento em background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200 && (fresh.type === "basic" || fresh.type === "default")) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});

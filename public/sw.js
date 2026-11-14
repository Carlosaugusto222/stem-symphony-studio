// Service Worker - PlayAlong Studio PWA
const CACHE_NAME = "playalong-pwa-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/logo.webp",
  "/logo-32.webp",
  "/logo.jpeg",
];

// Instalação do Service Worker com pré-cache e ativação imediata
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Falha ao pré-cachear alguns assets não críticos:", err);
      });
    }),
  );
});

// Ativação e limpeza de versões antigas do cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Suporte para mensagem manual de atualização
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Verificação de rotas e dados sensíveis que NUNCA devem ser cacheados
function isSensitiveOrApi(request, url) {
  if (request.method !== "GET") return true;
  if (request.headers.get("Authorization") || request.headers.get("cookie")) return true;

  const path = url.pathname.toLowerCase();
  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/auth") ||
    path.includes("token") ||
    path.includes("payment") ||
    path.includes("checkout") ||
    path.includes("webhook") ||
    path.includes("gradio_api") ||
    path.includes("queue/join") ||
    path.includes("queue/data")
  ) {
    return true;
  }

  // Não cachear uploads grandes ou chamadas de telemetria externa
  if (url.origin.includes("hf.space") || url.origin.includes("huggingface.co")) {
    return true;
  }

  return false;
}

// Estratégia de busca com fallback offline
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar protocolos que não sejam http(s)
  if (!url.protocol.startsWith("http")) return;

  // Requisições autenticadas, sensíveis ou de APIs dinâmicas: sempre Network-only sem cache
  if (isSensitiveOrApi(request, url)) {
    return;
  }

  // 1. Navegação de páginas HTML: Network-first com fallback para cache e offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response("Desconectado da internet", { status: 503 });
        }),
    );
    return;
  }

  // 2. Assets estáticos (scripts, estilos, fontes, imagens): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|webmanifest)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
    return;
  }

  // 3. Demais requisições: Network-first
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request)),
  );
});

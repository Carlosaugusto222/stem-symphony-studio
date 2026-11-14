/**
 * Registra o Service Worker PWA estritamente em ambiente de produção.
 * Gerencia ciclo de atualização suave para evitar bloqueios em versões antigas.
 */
export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Registrar estritamente em produção para que preview e desenvolvimento local não sofram cache stale
  const isProd = import.meta.env.PROD || process.env.NODE_ENV === "production";
  if (!isProd) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Verifica atualizações periodicamente
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Nova versão detectada: notifica skipWaiting
                installingWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("[PWA Registration Error]", error);
      });

    // Quando o novo service worker assume o controle (clients.claim), atualiza a visualização
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

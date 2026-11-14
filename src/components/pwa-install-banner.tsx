import { useState, useEffect } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "playalong_pwa_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Começa true para evitar flash no SSR

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Verifica se já está rodando em modo standalone (PWA instalado)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Verifica se o usuário já dispensou recentemente
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed && Date.now() - Number(lastDismissed) < DISMISS_DURATION_MS) {
      setDismissed(true);
      return;
    }

    setDismissed(false);

    // Detecta iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isIosDevice);

    // Captura evento beforeinstallprompt para Chromium / Android / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("[PWA Install Error]", err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Ignora erro de quota em localStorage
    }
  };

  // Se já está instalado, foi dispensado ou não há gatilho no navegador, não renderiza
  if (isStandalone || dismissed || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <aside
      aria-label="Instalar aplicativo"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-white/15 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-start gap-3">
        <img
          src="/icon-192.png"
          alt="Ícone do PlayAlong Studio"
          width={40}
          height={40}
          loading="lazy"
          className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover shadow-md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-zinc-100 tracking-wide font-mono">
              INSTALAR PLAYALONG
            </h4>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dispensar aviso de instalação"
              className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-400 leading-snug">
            {isIos
              ? "Instale no iPhone/iPad para praticar em tela cheia com acesso instantâneo."
              : "Instale o app para ter acesso rápido offline e console em tela cheia."}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            {isIos ? (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300">
                <Share size={12} className="text-emerald-400 shrink-0" />
                <span>Toque em Compartilhar e depois em <b>Adicionar à Tela de Início</b></span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm cursor-pointer transition-all duration-200"
              >
                <Download size={13} />
                <span>Instalar App</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] text-zinc-400 hover:text-zinc-300 px-2 py-1 cursor-pointer transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

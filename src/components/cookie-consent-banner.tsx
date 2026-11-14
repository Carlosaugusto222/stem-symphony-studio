import { useState, useEffect } from "react";
import { Cookie, ShieldCheck, X, Check, Settings2 } from "lucide-react";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = "playalong_cookie_consent";

export function getStoredCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const consent = getStoredCookieConsent();
    if (!consent) {
      // Pequeno delay para não sobrepor animações de carregamento inicial
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }

    const handleOpen = () => {
      const current = getStoredCookieConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setCustomizing(true);
      setVisible(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpen);
    return () => window.removeEventListener("open-cookie-preferences", handleOpen);
  }, []);

  const savePreferences = (prefs: { analytics: boolean; marketing: boolean }) => {
    const payload: CookiePreferences = {
      essential: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignora erro de quota
    }

    window.dispatchEvent(new CustomEvent("consent-changed", { detail: payload }));
    setVisible(false);
    setCustomizing(false);
  };

  const handleAcceptAll = () => {
    savePreferences({ analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    savePreferences({ analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    savePreferences({ analytics, marketing });
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Consentimento de Cookies e Privacidade"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 text-zinc-100"
    >
      {!customizing ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
              <Cookie size={18} />
            </span>
            <div className="text-xs leading-relaxed text-zinc-300">
              <p className="font-semibold text-zinc-100 mb-0.5">Sua privacidade e cookies (LGPD)</p>
              Utilizamos cookies essenciais para o funcionamento do mixer de áudio e dados anônimos para aprimoramento contínuo. Saiba mais em nossa{" "}
              <a
                href="/politica-de-privacidade"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors"
              >
                Política de Privacidade
              </a>{" "}
              e{" "}
              <a
                href="/termos-de-uso"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors"
              >
                Termos de Uso
              </a>.
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white rounded border border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors"
            >
              Personalizar
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              className="px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white rounded border border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors"
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded cursor-pointer transition-colors shadow-sm"
            >
              Aceitar todos
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Preferências de Privacidade & Cookies
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCustomizing(false)}
              className="text-zinc-400 hover:text-zinc-200 p-1 rounded"
              aria-label="Fechar personalização"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Essenciais */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
              <div>
                <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Cookies Essenciais (Obrigatórios)</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Necessários para o funcionamento do motor de áudio Web Audio, buffers de ensaio, carregamento de sessão e segurança.
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                Sempre Ativo
              </span>
            </div>

            {/* Analíticos */}
            <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
              <div>
                <span className="font-medium text-zinc-200">Cookies de Análise e Desempenho</span>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Coletam métricas anônimas de uso e diagnóstico de erros para nos ajudar a melhorar o desempenho do mixer.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 cursor-pointer"
              />
            </label>

            {/* Marketing */}
            <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
              <div>
                <span className="font-medium text-zinc-200">Cookies de Marketing e Comunicação</span>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Permitem personalizar eventuais novidades sobre atualizações do modelo Demucs v4 e recursos do estúdio.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 cursor-pointer"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <a
              href="/politica-de-privacidade"
              className="text-zinc-400 hover:text-emerald-400 underline underline-offset-2 transition-colors"
            >
              Ler Política Completa
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-3 py-1.5 rounded border border-zinc-800 hover:bg-zinc-900 text-zinc-300 transition-colors cursor-pointer"
              >
                Recusar Não Essenciais
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Salvar Escolhas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getStoredHuggingFaceToken,
  setStoredHuggingFaceToken,
  checkDemucsHealth,
} from "@/lib/audio/demucs";
import { Key, Check, AlertCircle, Loader2, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";

interface HfTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (status: "online" | "local") => void;
}

export function HfTokenModal({ open, onOpenChange, onSaved }: HfTokenModalProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setToken(getStoredHuggingFaceToken());
      setTestResult(null);
    }
  }, [open]);

  const handleTest = async () => {
    if (!token.trim()) {
      setTestResult({ success: false, message: "Insira um token antes de testar." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const health = await checkDemucsHealth(token.trim());
      if (health === "online") {
        setTestResult({
          success: true,
          message: "Conexão estabelecida com sucesso com o cluster Demucs v4 ZeroGPU!",
        });
      } else {
        setTestResult({
          success: false,
          message: "Não foi possível conectar ao cluster com este token. Verifique se o token é válido.",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Erro desconhecido ao testar conexão.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setStoredHuggingFaceToken(token);
    setTesting(true);
    try {
      const health = await checkDemucsHealth();
      onSaved?.(health);
      onOpenChange(false);
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    setStoredHuggingFaceToken("");
    setToken("");
    setTestResult(null);
    const health = await checkDemucsHealth("");
    onSaved?.(health);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Key size={16} />
            </span>
            <DialogTitle className="text-base font-semibold">
              Token de IA Hugging Face (Demucs v4)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed">
            O isolamento de voz e instrumentos em alta fidelidade roda na rede neural Demucs v4
            hospedada na ZeroGPU. Adicione seu token de acesso (gratuito) para ativar a separação
            por IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex justify-between items-center">
              <span>User Access Token (Hugging Face)</span>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 transition-colors"
              >
                Gerar token gratuito <ExternalLink size={10} />
              </a>
            </label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="hf_..."
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setTestResult(null);
                }}
                className="bg-zinc-900/80 border-zinc-800 pr-10 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-amber-500/40"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                tabIndex={-1}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              O token é salvo de forma segura no seu navegador (armazenamento local).
            </p>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                  : "bg-red-950/40 border-red-800/50 text-red-300"
              }`}
            >
              {testResult.success ? (
                <Check size={14} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-zinc-800/80">
          <div>
            {getStoredHuggingFaceToken() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs h-8 px-2"
              >
                <Trash2 size={13} className="mr-1" /> Remover
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !token.trim()}
              className="border-zinc-800 hover:bg-zinc-900 text-xs h-8"
            >
              {testing ? <Loader2 size={12} className="spin mr-1" /> : null}
              Testar Conexão
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={testing}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-8"
            >
              {testing ? <Loader2 size={12} className="spin mr-1" /> : null}
              Salvar e Ativar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, RefreshCw, Home } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registra o detalhe técnico completo no console para depuração
    console.error("[Global Error Boundary]", error, errorInfo);
    try {
      reportLovableError(error, {
        boundary: "global_react_error_boundary",
        componentStack: errorInfo.componentStack || undefined,
      });
    } catch {
      // Ignora falhas de reporte para manter a tela de contingência funcional
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error || new Error("Erro desconhecido"),
          reset: this.handleReset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[70vh] w-full items-center justify-center p-6 text-foreground">
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground font-mono">
              Algo inesperado aconteceu
            </h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[45ch] mx-auto">
              Ocorreu uma falha inesperada durante a exibição deste componente. Seus áudios locais não foram alterados.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Tentar de novo
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:bg-glass hover:text-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Recarregar página
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:bg-glass hover:text-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Home className="h-3.5 w-3.5" /> Voltar ao Início
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

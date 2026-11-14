import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { FileQuestion, AlertTriangle, RotateCcw, Home } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ErrorBoundary } from "../components/error-boundary";
import { Toaster } from "../components/ui/sonner";
import { registerPwaServiceWorker } from "../lib/pwa-register";
import { PwaInstallBanner } from "../components/pwa-install-banner";
import { CookieConsentBanner } from "../components/cookie-consent-banner";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center p-8 rounded-xl border border-border bg-card shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="text-5xl font-bold text-foreground font-mono">404</h1>
        <h2 className="mt-3 text-lg font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[42ch] mx-auto">
          O endereço acessado não existe, foi movido ou o link expirou. Volte ao console para continuar seus ensaios multitrack.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="h-3.5 w-3.5" /> Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  // Registra o detalhe técnico no console para diagnóstico sem expor stack trace cru ao usuário
  console.error("[TanStack Root Route Error]", error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center p-8 rounded-xl border border-destructive/30 bg-card shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground font-mono">
          Não foi possível carregar a página
        </h1>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[45ch] mx-auto">
          Ocorreu uma instabilidade ao inicializar esta rota. Seus dados e áudios locais permanecem preservados.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Tentar de novo
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PlayAlong Studio" },
      { name: "description", content: "Estúdio de ensaio e mixagem multitrack para músicos." },
      { name: "author", content: "Lovable" },
      { name: "theme-color", content: "#0e0e11" },
      { name: "application-name", content: "PlayAlong Studio" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "PlayAlong" },
      { property: "og:title", content: "PlayAlong Studio" },
      { property: "og:description", content: "Seu console de ensaio multitrack." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preload", as: "image", href: "/logo.webp", type: "image/webp" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerPwaServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </ErrorBoundary>
      <PwaInstallBanner />
      <CookieConsentBanner />
      <Toaster position="bottom-right" richColors theme="dark" />
    </QueryClientProvider>
  );
}

export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Não foi possível carregar a página</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0e0e11; color: #f4f4f5; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: #18181b; border: 1px solid #27272a; border-radius: 8px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #fafafa; font-family: monospace; }
      p { color: #a1a1aa; margin: 0 0 1.5rem; font-size: 13px; line-height: 1.6; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; font-size: 13px; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #fafafa; color: #09090b; font-weight: 500; }
      .secondary { background: #27272a; color: #f4f4f5; border-color: #3f3f46; }
      #lovable-badge {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Não foi possível carregar a página</h1>
      <p>Ocorreu uma instabilidade no servidor. Você pode tentar recarregar ou voltar para a página inicial.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar de novo</button>
        <a class="secondary" href="/">Voltar ao Início</a>
      </div>
    </div>
  </body>
</html>`;
}

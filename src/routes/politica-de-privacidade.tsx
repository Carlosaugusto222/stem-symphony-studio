import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, Lock, FileText, CheckCircle, Cookie, Mail } from "lucide-react";
import { openCookiePreferences } from "@/components/cookie-consent-banner";

const privacyStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://playalong.studio/politica-de-privacidade#webpage",
  "url": "https://playalong.studio/politica-de-privacidade",
  "name": "Política de Privacidade e Dados LGPD — PlayAlong Studio",
  "description":
    "Conheça as diretrizes de privacidade e proteção de dados LGPD do PlayAlong Studio: processamento seguro de áudio na memória e controle de cookies.",
  "inLanguage": "pt-BR",
  "isPartOf": {
    "@type": "WebSite",
    "@id": "https://playalong.studio/#website",
    "name": "PlayAlong Studio",
    "url": "https://playalong.studio/",
  },
};

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade e Dados LGPD — PlayAlong Studio" },
      {
        name: "description",
        content:
          "Conheça as diretrizes de privacidade e proteção de dados LGPD do PlayAlong Studio: processamento seguro de áudio na memória e controle de cookies.",
      },
      { property: "og:title", content: "Política de Privacidade e Dados LGPD — PlayAlong Studio" },
      {
        property: "og:description",
        content:
          "Conheça as diretrizes de privacidade e proteção de dados LGPD do PlayAlong Studio: processamento seguro de áudio na memória e controle de cookies.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://playalong.studio/politica-de-privacidade" },
      { property: "og:site_name", content: "PlayAlong Studio" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:image", content: "https://playalong.studio/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Política de Privacidade — PlayAlong Studio" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Política de Privacidade e Dados LGPD — PlayAlong Studio" },
      {
        name: "twitter:description",
        content:
          "Conheça as diretrizes de privacidade e proteção de dados LGPD do PlayAlong Studio: processamento seguro de áudio na memória e controle de cookies.",
      },
      { name: "twitter:image", content: "https://playalong.studio/og-image.png" },
      { name: "twitter:image:alt", content: "Política de Privacidade — PlayAlong Studio" },
    ],
    links: [
      { rel: "canonical", href: "https://playalong.studio/politica-de-privacidade" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(privacyStructuredData),
      },
    ],
  }),
  component: PoliticaDePrivacidade,
});

export function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f5] px-4 py-8 sm:py-12">
      <div className="max-w-[72ch] mx-auto">
        {/* Header Navigation */}
        <header className="mb-8 pb-6 border-b border-zinc-800/80 flex items-center justify-between gap-4">
          <nav aria-label="Navegação secundária">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-1"
            >
              <ArrowLeft size={14} /> Voltar ao Console de Ensaio
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield size={14} />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 tracking-wider uppercase">LGPD / Lei 13.709</span>
          </div>
        </header>

        {/* Title Block */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            POLÍTICA DE PRIVACIDADE
          </h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Última atualização: 14 de novembro de 2026 · Versão 2.4 (Conformidade LGPD)
          </p>
          <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
            Esta Política de Privacidade descreve de forma transparente e objetiva como o{" "}
            <strong className="text-white">PlayAlong Studio</strong> realiza o tratamento de dados pessoais,
            áudios enviados e informações técnicas, em estrita observância à Lei Geral de Proteção de Dados Pessoais do Brasil
            (Lei nº 13.709/2018 — LGPD).
          </p>
        </div>

        {/* Main Content Sections */}
        <main className="space-y-8 text-sm leading-relaxed text-zinc-300">
          {/* 1. Controlador e DPO */}
          <section className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-base font-semibold text-white font-mono flex items-center gap-2 mb-3">
              1. IDENTIFICAÇÃO DO CONTROLADOR E ENCARREGADO (DPO)
            </h2>
            <p className="mb-2">
              O controle e a responsabilidade pelo tratamento dos dados nos termos desta plataforma são exercidos por:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
              <li><strong>Controlador:</strong> [Razão Social da Empresa]</li>
              <li><strong>CNPJ:</strong> [CNPJ nº XX.XXX.XXX/0001-XX]</li>
              <li><strong>Endereço:</strong> [Endereço da Empresa]</li>
              <li><strong>Encarregado pelo Tratamento de Dados (DPO):</strong> [Nome do Encarregado de Dados]</li>
              <li><strong>Canal de Contato com o DPO:</strong> [dpo@seudominio.com]</li>
            </ul>
          </section>

          {/* 2. Dados Coletados */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono flex items-center gap-2 mb-3">
              2. QUAIS DADOS SÃO TRATADOS E COMO
            </h2>
            <p className="mb-3">
              O PlayAlong Studio foi projetado sob o princípio da <em>Privacy by Design</em> e minimização de dados:
            </p>
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                <h3 className="font-semibold text-white text-xs uppercase font-mono mb-1">
                  A. Arquivos de Áudio Carregados (WAV, MP3, FLAC, AIFF, M4A)
                </h3>
                <p className="text-xs text-zinc-400">
                  Os arquivos de áudio enviados para separação ou prática são processados <strong>temporariamente na memória de sessão (RAM) do seu navegador</strong> via Web Audio API. O estúdio não armazena cópias permanentes das suas composições em bancos de dados relacionais e descarta os dados voláteis ao fechar a aba ou navegador.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                <h3 className="font-semibold text-white text-xs uppercase font-mono mb-1">
                  B. Gravações de Ensaio via Microfone
                </h3>
                <p className="text-xs text-zinc-400">
                  O acesso ao microfone requer autorização prévia e expressa concedida pelo navegador. A captura ocorre unicamente durante a execução do comando "Gravar Ensaio", sendo o arquivo final baixado diretamente para a sua máquina pessoal, sem transmissão ou retenção em servidores.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                <h3 className="font-semibold text-white text-xs uppercase font-mono mb-1">
                  C. Token de IA Hugging Face (Opcional)
                </h3>
                <p className="text-xs text-zinc-400">
                  Caso o usuário opte por inserir seu próprio token da Hugging Face para o Demucs v4, ele é armazenado localmente no <code>localStorage</code> do seu navegador e enviado exclusivamente via cabeçalho autenticado HTTPS para os endpoints do Space oficial.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                <h3 className="font-semibold text-white text-xs uppercase font-mono mb-1">
                  D. Dados Técnicos e Cookies de Consentimento
                </h3>
                <p className="text-xs text-zinc-400">
                  Registramos preferências locais (como andamento BPM customizado, consentimento de cookies e status PWA) no armazenamento do navegador para garantir a continuidade da sua sessão de ensaio.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Finalidades e Bases Legais */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-3">
              3. FINALIDADES E BASES LEGAIS (LGPD ART. 7º)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-zinc-800 rounded-lg">
                <thead className="bg-zinc-900 text-zinc-300 font-mono">
                  <tr>
                    <th className="p-2.5 border-b border-zinc-800">Finalidade</th>
                    <th className="p-2.5 border-b border-zinc-800">Dados Tratados</th>
                    <th className="p-2.5 border-b border-zinc-800">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-400">
                  <tr>
                    <td className="p-2.5">Separação de faixas e mixagem de áudio</td>
                    <td className="p-2.5">Áudio em memória RAM</td>
                    <td className="p-2.5">Execução de Contrato (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Gravação de prática com playback</td>
                    <td className="p-2.5">Stream de áudio local</td>
                    <td className="p-2.5">Consentimento Expresso (Art. 7º, I)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Diagnóstico de erros e telemetria anônima</td>
                    <td className="p-2.5">Logs técnicos de runtime</td>
                    <td className="p-2.5">Legítimo Interesse (Art. 7º, IX)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Armazenamento de preferências de cookies</td>
                    <td className="p-2.5">Chaves locais do navegador</td>
                    <td className="p-2.5">Cumprimento de Obrigação Legal (Art. 7º, II)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Compartilhamento */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-3">
              4. COMPARTILHAMENTO COM TERCEIROS
            </h2>
            <p className="mb-2">
              Seus dados não são vendidos ou comercializados. O compartilhamento ocorre estritamente para a viabilização técnica das seguintes ferramentas:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-400">
              <li>
                <strong className="text-zinc-200">Hugging Face Spaces (ZeroGPU / Demucs v4):</strong> Quando você aciona a separação por Inteligência Artificial, o arquivo é enviado de forma criptografada para o modelo neural em nuvem, processado e devolvido ao seu navegador em buffers de áudio isolados.
              </li>
              <li>
                <strong className="text-zinc-200">Provedor de Borda e CDN (Cloudflare / Nitro):</strong> Entrega estática de assets, scripts otimizados e certificados de segurança HTTPS.
              </li>
              <li>
                <strong className="text-zinc-200">Google Fonts:</strong> Fornecimento das famílias tipográficas do estúdio (JetBrains Mono e Inter Tight).
              </li>
            </ul>
          </section>

          {/* 5. Retenção */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-3">
              5. TEMPO DE RETENÇÃO E ARMAZENAMENTO
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Os áudios carregados permanecem ativos unicamente enquanto durar a sua sessão no navegador. Fechada a janela, todos os dados em memória RAM são liberados e destruídos. Tokens e preferências salvas em <code>localStorage</code> persistem até que você decida removê-los voluntariamente pelo botão correspondente na interface ou limpando o histórico do navegador.
            </p>
          </section>

          {/* 6. Direitos do Titular */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-3">
              6. SEUS DIREITOS COMO TITULAR (LGPD ART. 18)
            </h2>
            <p className="mb-2">Você possui o direito de solicitar a qualquer momento:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                "Confirmação da existência de tratamento",
                "Acesso facilitado aos dados tratados",
                "Correção de dados incompletos ou inexatos",
                "Anonimização, bloqueio ou eliminação de dados",
                "Portabilidade dos seus dados",
                "Revogação do consentimento concedido",
                "Informações sobre entidades com quem compartilhamos dados",
                "Oposição a tratamentos fundados em legítimo interesse",
              ].map((right, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-zinc-900/40 border border-zinc-800/80 text-zinc-300">
                  <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                  <span>{right}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Canal de Contato */}
          <section className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <h2 className="text-base font-semibold text-white font-mono flex items-center gap-2 mb-2">
              <Mail size={16} className="text-emerald-400" />
              7. CANAL DE ATENDIMENTO DO TITULAR E DPO
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Para exercer qualquer um dos seus direitos da LGPD, esclarecer dúvidas ou relatar preocupações de privacidade, contate diretamente o nosso Encarregado pelo Tratamento de Dados Pessoais:
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-400">
              <span>E-mail do Encarregado:</span>
              <a href="mailto:dpo@seudominio.com" className="underline hover:text-emerald-300">
                [dpo@seudominio.com]
              </a>
            </div>
          </section>

          {/* Gerenciar Cookies e Termos */}
          <footer className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <Cookie size={14} className="text-emerald-400" />
              Gerenciar Preferências de Cookies
            </button>
            <Link
              to="/termos-de-uso"
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Consultar Termos de Uso →
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Scale, Shield, Cookie } from "lucide-react";
import { openCookiePreferences } from "@/components/cookie-consent-banner";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — PlayAlong Studio" },
      {
        name: "description",
        content:
          "Termos e Condições de Uso do PlayAlong Studio. Regras para separação de faixas, ensaio multitrack e responsabilidade de direitos autorais.",
      },
      { property: "og:title", content: "Termos de Uso — PlayAlong Studio" },
      {
        property: "og:description",
        content: "Condições de utilização e direitos autorais no PlayAlong Studio.",
      },
    ],
  }),
  component: TermosDeUso,
});

export function TermosDeUso() {
  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f5] px-4 py-8 sm:py-12">
      <div className="max-w-[72ch] mx-auto">
        {/* Header Navigation */}
        <header className="mb-8 pb-6 border-b border-zinc-800/80 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-1"
          >
            <ArrowLeft size={14} /> Voltar ao Console de Ensaio
          </Link>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale size={14} />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 tracking-wider uppercase">CONTRATO DE USO</span>
          </div>
        </header>

        {/* Title Block */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            TERMOS DE USO
          </h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Última atualização: 14 de novembro de 2026 · Versão 2.4
          </p>
          <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
            Bem-vindo ao <strong className="text-white">PlayAlong Studio</strong>. Ao acessar o console, carregar arquivos de áudio, separar faixas com IA ou praticar suas mixagens, você concorda expressamente com os seguintes Termos e Condições de Uso.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          {/* 1. Objeto */}
          <section className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-base font-semibold text-white font-mono mb-2">
              1. OBJETO E DESCRIÇÃO DO SERVIÇO
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O PlayAlong Studio é uma plataforma digital desenvolvida para fins de estudo, ensaio e aprimoramento musical. O sistema possibilita que instrumentistas e vocalistas carreguem faixas, isolem instrumentos (via rede neural Demucs v4 ou filtros de frequências locais), controlem faders independentes, ajustem andamento (BPM), configurem loops A-B e exportem mixagens personalizadas.
            </p>
          </section>

          {/* 2. Direitos Autorais */}
          <section className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <h2 className="text-base font-semibold text-amber-400 font-mono flex items-center gap-2 mb-2">
              <AlertCircle size={16} />
              2. DIREITOS AUTORAIS E PROPRIEDADE DOS ÁUDIOS
            </h2>
            <div className="space-y-2 text-xs text-zinc-300">
              <p>
                <strong>2.1. Titularidade do Usuário:</strong> O usuário declara e garante que detém a titularidade, licença legítima ou autorização legal necessária sobre qualquer arquivo de áudio carregado ou link fornecido na plataforma, em estrita conformidade com a Lei de Direitos Autorais brasileira (Lei nº 9.610/1998).
              </p>
              <p>
                <strong>2.2. Finalidade de Estudo Pessoal:</strong> O isolamento de faixas e mixagens geradas devem destinar-se prioritariamente a atividades de estudo pessoal, ensaio, prática instrumental e fins didáticos amparados pela legislação.
              </p>
              <p>
                <strong>2.3. Não Apropriação:</strong> O PlayAlong Studio não reivindica quaisquer direitos de propriedade intelectual ou autoral sobre as músicas enviadas por seus usuários.
              </p>
            </div>
          </section>

          {/* 3. Armazenamento e Perda de Dados */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-2">
              3. CARÁTER VOLÁTIL DA SESSÃO E RESPONSABILIDADE POR BACKUP
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Por razões de privacidade e integridade de dados (<em>Privacy by Design</em>), os áudios processados ficam armazenados <strong>estritamente na memória volátil (RAM) da sua sessão de navegação</strong>. Ao atualizar ou fechar a janela, a sessão é encerrada e os dados não exportados são descartados. É dever exclusivo do usuário utilizar a função "Exportar Mixagem (WAV/MP3)" ou "Exportar Faixa Isolada" antes de finalizar a navegação.
            </p>
          </section>

          {/* 4. Serviços de IA */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-2">
              4. SERVIÇOS DE INTELIGÊNCIA ARTIFICIAL E TERCEIROS
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A separação por redes neurais utiliza o modelo aberto Demucs v4 hospedado em clusters ZeroGPU da Hugging Face. O usuário reconhece que serviços baseados em nuvens públicas de inteligência artificial podem estar sujeitos a filas, latências de processamento ou indisponibilidades temporárias de infraestrutura externa, razão pela qual a plataforma fornece o modo de prévia local instantânea como alternativa de contingência.
            </p>
          </section>

          {/* 5. Condutas Proibidas */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-2">
              5. CONDUTAS PROIBIDAS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              {[
                "Enviar arquivos maliciosos ou corrompidos",
                "Tentar burlar limites de requisições ou quotas de IA",
                "Utilizar a plataforma para distribuição pirata de fonogramas",
                "Realizar engenharia reversa do código proprietário",
                "Usar robôs de automação agressiva não autorizados",
                "Violar direitos de privacidade ou propriedade de terceiros",
              ].map((prohibition, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-zinc-900/40 border border-zinc-800/80">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>{prohibition}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Limitação de Responsabilidade */}
          <section>
            <h2 className="text-lg font-semibold text-white font-mono mb-2">
              6. ISENÇÃO E LIMITAÇÃO DE RESPONSABILIDADE
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A ferramenta é fornecida "como está" (<em>as is</em>) e "conforme disponível". Não garantimos que a separação de áudio seja 100% isenta de resíduos espectrais ou artefatos acústicos, uma vez que o isolamento decorre de algoritmos probabilísticos de processamento de sinais de áudio e redes neurais.
            </p>
          </section>

          {/* 7. Foro e Legislação */}
          <section className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-base font-semibold text-white font-mono mb-2">
              7. LEGISLAÇÃO APLICÁVEL E FORO
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Estes Termos são regidos integralmente pelas leis vigentes na República Federativa do Brasil. Para a solução de controvérsias decorrentes deste contrato, elege-se o Foro da Comarca de [Sede da Empresa], renunciando expressamente a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          {/* 8. Contato */}
          <section className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800 text-xs text-zinc-400">
            <p>
              Dúvidas ou solicitações relativas a estes Termos de Uso podem ser encaminhadas para a equipe de suporte através do e-mail:{" "}
              <a href="mailto:suporte@seudominio.com" className="text-emerald-400 underline hover:text-emerald-300">
                [suporte@seudominio.com]
              </a>
              {" "}ou diretamente à pessoa jurídica controladora <strong>[Razão Social da Empresa]</strong>, inscrita no CNPJ sob nº <strong>[CNPJ nº XX.XXX.XXX/0001-XX]</strong>.
            </p>
          </section>

          {/* Rodapé Interno */}
          <section className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <Cookie size={14} className="text-emerald-400" />
              Preferências de Cookies
            </button>
            <Link
              to="/politica-de-privacidade"
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Ver Política de Privacidade (LGPD) →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

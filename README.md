# Stem Symphony Studio

App que separa os áudios de uma música por cada instrumento musical e que eu possa mutar ou ajustar o volume de cada instrumento para criar um play-along/backing track para músicos praticando, com paridade total entre instrumentos e voz, começando pela implementação do fluxo de upload e separação de faixas no visual Matte Studio.

Locked:
- Visual Direction: Matte Studio (adotado pelo usuário).
  - Paleta: Fundo grafite profundo (#121316), cards e painéis (#1a1c20), linhas e divisores (#2a2d33), titânio (#c9ccd1) para textos e elementos interativos, muted (#6b7079) para rótulos secundários, branco puro (#ffffff) para estados ativos, e vidro leitoso fosco sutil (rgba(220, 225, 232, 0.05) com bordas em 0.09).
  - Tipografia: 'JetBrains Mono' (monospace) para medições, dados técnicos, timecodes, botões e controles; 'Inter Tight' (sans-serif) para títulos e identificadores de faixas.
  - Formas e Componentes: Botões táteis com cantos de raio sutil (2px a 4px), caixas e módulos estilo console de rack analógico alemão, linhas milimétricas de alta precisão.
  - Telas Aprovadas:
    1. Upload e Separação de Stems: Topo com logo técnico PLAYALONG // INGESTION ENGINE v2.4, status pills (STATUS: PRONTO, MODELO: DEMUCS v4 HD, 48kHz LOSSLESS) e botão de biblioteca; dropzone de alta fidelidade com borda tracejada em titânio para envio de arquivos de áudio (WAV, FLAC, MP3, AIFF) e campo para colar URL de áudio; seletor de 5 stems com paridade total ([✓ VOZ] [✓ BATERIA] [✓ BAIXO] [✓ GUITARRAS] [✓ TECLADOS / OUTROS]); seletor de qualidade Modo Estúdio vs Rápido; monitor de separação em tempo real com barra geral de progresso e detalhamento individual por instrumento (VOZ, BATERIA, BAIXO, GUITARRAS, TECLADOS); botão primário em branco sólido "ABRIR NO MIXER DE ENSAIO".
    2. Mixer de Prática e Estudo: Barra de transporte e display de tempo com chave de Metrônomo (Click On), marcadores de seções de música (INTRO, VERSE 1, CHORUS, GUITAR SOLO); seletor rápido "PRÁTICA ATIVA >" com botões de instrumentos e alternância MUTE TOTAL / GUIA 20%; 5 channel strips com waveforms técnicas, botões táteis SOLO e MUTE, faders verticais graduados (-∞ a +6dB), knobs de Pan e medidores de decibéis; barra inferior com motor 48kHz, gravação de prática e exportação de play-along customizado.
  - Regras de Design:
    - "Estética de console de estúdio e hardware de áudio: fundo grafite profundo (#121316), acabamento fosco suave, vidro leitoso sutil, linhas milimétricas e tipografia técnica mono de alta precisão."
    - "Paridade total entre faixas de instrumentos e voz: cada stem conta com solo, mute, fader calibrado em dB, pan e botão rápido de modo guia a 20%."

Open:
- Arquitetura: React, Tailwind CSS, TypeScript, Lucide Icons, e Web Audio API para reprodução e mixagem multitrack sincronizada em tempo real.
- Inclusão de faixas de demonstração já processadas com os 5 stems (Vocal, Bateria, Baixo, Guitarra, Teclado) para que o usuário possa testar e tocar imediatamente sem ter que aguardar processamento na primeira visita.
- Fluxo de upload funcional com pré-visualização, simulação realista de extração de stems ou integração de backend para processamento, e transição suave para a mesa de som com as faixas carregadas.
- Responsividade e refinamento ergonômico para desktop e tablets.

build a real working app, not a clickable prototype; the screen and kit files show layout, content and look (a wireframe's, structure only) and are never code to copy. The screens are the moments the user designed, not the whole product. Before building, walk through each flow as its user would and design what the pictures leave out, as a product designer would for this product: the steps a flow needs to finish and how the app responds to what the user does, including the moments its users will actually run into, like waiting on something or finding nothing yet. Add nothing a user of this product would never meet, and keep an app the user wants simple, simple. Never leave a step the product's core flows need as "coming soon", unless the brief says the user chose to. Where such a step needs an outside service, build every part up to it and say in your reply what's left to connect. Fill product gaps only, never a look the design set: an added step reuses the UI kit's tokens, chrome and parts and the nearest designed screen's layout, with no new visual direction. Look at every screen's picture before writing code; design.md says which picture or sheet holds each screen. Open the UI kit's shells and parts HTML for the header, tab bar, composer and components, not only its tokens. Use each finished screen's copy exactly as design.md lists it; never invent copy for one. A wireframe under design.md's Wireframes gives structure only: build it in the design's look, as design.md says. The screens' photos are placeholders for the mockups only: replace every photo design.md lists with the user's own upload for it, else as design.md says (a photo without people re-composed with imagegen--edit_image from it as a reference, a photo of people generated from its brief and never from the photo), and ship no set photo or its URL. Build and check each screen at the canvas it was drawn at: phone 393×764, tablet landscape 1133×744, tablet portrait 744×1133, desktop 1280×832. After building, screenshot the app at those sizes and states, compare each finished screen with its picture, and fix every visual difference you didn't choose; check a wireframe's screen against its structure, never its grey look. End your reply with "Changed from the mockups": each deliberate change and why, and "Added beyond the mockups": each step, state or interaction you built that no screen shows.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stem-symphony-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/876f06fc-6535-4378-8aaa-1d5b2b6432e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

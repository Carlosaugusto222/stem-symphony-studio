import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/studio/studio";

const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://playalong.studio/#app",
      "name": "PlayAlong Studio",
      "url": "https://playalong.studio/",
      "description":
        "Separe faixas, pratique com play-alongs isolados e controle stems de bateria, baixo e vocais no navegador com sincronia profissional em tempo real.",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "All",
      "browserRequirements": "Requires Web Audio API and WebAssembly support",
      "inLanguage": "pt-BR",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "BRL",
      },
      "publisher": {
        "@type": "Organization",
        "@id": "https://playalong.studio/#organization",
        "name": "PlayAlong Studio",
        "url": "https://playalong.studio/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://playalong.studio/og-image.png",
          "width": 1200,
          "height": 630,
        },
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://playalong.studio/#website",
      "url": "https://playalong.studio/",
      "name": "PlayAlong Studio",
      "inLanguage": "pt-BR",
      "publisher": {
        "@id": "https://playalong.studio/#organization",
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlayAlong Studio — Ensaio Multitrack e Mixagem de Stems" },
      {
        name: "description",
        content:
          "Separe faixas, pratique com play-alongs isolados e controle stems de bateria, baixo e vocais no navegador com sincronia profissional em tempo real.",
      },
      { property: "og:title", content: "PlayAlong Studio — Ensaio Multitrack e Mixagem de Stems" },
      {
        property: "og:description",
        content:
          "Separe faixas, pratique com play-alongs isolados e controle stems de bateria, baixo e vocais no navegador com sincronia profissional em tempo real.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://playalong.studio/" },
      { property: "og:site_name", content: "PlayAlong Studio" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:image", content: "https://playalong.studio/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "PlayAlong Studio — Console de Ensaio e Mixagem Multitrack" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PlayAlong Studio — Ensaio Multitrack e Mixagem de Stems" },
      {
        name: "twitter:description",
        content:
          "Separe faixas, pratique com play-alongs isolados e controle stems de bateria, baixo e vocais no navegador com sincronia profissional em tempo real.",
      },
      { name: "twitter:image", content: "https://playalong.studio/og-image.png" },
      { name: "twitter:image:alt", content: "PlayAlong Studio — Console de Ensaio e Mixagem Multitrack" },
    ],
    links: [
      { rel: "canonical", href: "https://playalong.studio/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(homeStructuredData),
      },
    ],
  }),
  component: Studio,
});

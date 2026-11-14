import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/studio/studio";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlayAlong Studio — Upload e ensaio multitrack" },
      {
        name: "description",
        content:
          "Prepare seu áudio, controle cinco faixas independentes e exporte seu play-along no console Matte Studio.",
      },
      { property: "og:title", content: "PlayAlong Studio — Seu console de ensaio" },
      {
        property: "og:description",
        content: "Upload de áudio, demonstração multitrack e mixagem para músicos praticarem.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/logo.jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/logo.jpeg" },
    ],
  }),
  component: Studio,
});

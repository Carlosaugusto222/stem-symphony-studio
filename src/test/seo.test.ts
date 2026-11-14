import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { Route as HomeRoute } from "@/routes/index";
import { Route as PrivacyRoute } from "@/routes/politica-de-privacidade";
import { Route as TermsRoute } from "@/routes/termos-de-uso";

describe("SEO Meta Tags and Head Configurations", () => {
  const routes = [
    { name: "Home (/)", route: HomeRoute, expectedPath: "/" },
    { name: "Privacidade (/politica-de-privacidade)", route: PrivacyRoute, expectedPath: "/politica-de-privacidade" },
    { name: "Termos (/termos-de-uso)", route: TermsRoute, expectedPath: "/termos-de-uso" },
  ];

  it("defines specific titles between 50 and 60 characters for each route", () => {
    for (const { name, route } of routes) {
      const head = (route.options.head as any)?.();
      expect(head, `${name} should have head definition`).toBeDefined();
      const titleMeta = head?.meta?.find((m: any) => "title" in m);
      expect(titleMeta, `${name} should have a title`).toBeDefined();
      const title = titleMeta.title;
      expect(
        title.length,
        `${name} title "${title}" (${title.length} chars) should be between 50 and 60 characters`,
      ).toBeGreaterThanOrEqual(50);
      expect(
        title.length,
        `${name} title "${title}" (${title.length} chars) should be between 50 and 60 characters`,
      ).toBeLessThanOrEqual(60);
    }
  });

  it("defines specific descriptions between 140 and 160 characters for each route", () => {
    for (const { name, route } of routes) {
      const head = (route.options.head as any)?.();
      const descMeta = head?.meta?.find((m: any) => m.name === "description");
      expect(descMeta, `${name} should have description meta`).toBeDefined();
      const desc = descMeta.content;
      expect(
        desc.length,
        `${name} description (${desc.length} chars) should be between 140 and 160 characters`,
      ).toBeGreaterThanOrEqual(140);
      expect(
        desc.length,
        `${name} description (${desc.length} chars) should be between 140 and 160 characters`,
      ).toBeLessThanOrEqual(160);
    }
  });

  it("defines canonical link for each route", () => {
    for (const { name, route, expectedPath } of routes) {
      const head = (route.options.head as any)?.();
      const canonical = head?.links?.find((l: any) => l.rel === "canonical");
      expect(canonical, `${name} should have canonical link`).toBeDefined();
      expect(canonical.href).toContain(expectedPath);
    }
  });

  it("defines Open Graph and Twitter Card tags with 1200x630 image", () => {
    for (const { name, route } of routes) {
      const head = (route.options.head as any)?.();
      const ogTitle = head?.meta?.find((m: any) => m.property === "og:title");
      const ogDesc = head?.meta?.find((m: any) => m.property === "og:description");
      const ogImage = head?.meta?.find((m: any) => m.property === "og:image");
      const ogWidth = head?.meta?.find((m: any) => m.property === "og:image:width");
      const ogHeight = head?.meta?.find((m: any) => m.property === "og:image:height");
      const twCard = head?.meta?.find((m: any) => m.name === "twitter:card");
      const twImage = head?.meta?.find((m: any) => m.name === "twitter:image");

      expect(ogTitle, `${name} should have og:title`).toBeDefined();
      expect(ogDesc, `${name} should have og:description`).toBeDefined();
      expect(ogImage?.content, `${name} should have og:image`).toContain("og-image.png");
      expect(ogWidth?.content).toBe("1200");
      expect(ogHeight?.content).toBe("630");
      expect(twCard?.content).toBe("summary_large_image");
      expect(twImage?.content).toContain("og-image.png");
    }
  });

  it("includes valid JSON-LD structured data scripts in head", () => {
    for (const { name, route } of routes) {
      const head = (route.options.head as any)?.();
      const jsonLd = head?.scripts?.find((s: any) => s.type === "application/ld+json");
      expect(jsonLd, `${name} should have JSON-LD script`).toBeDefined();
      expect(() => JSON.parse(jsonLd.children)).not.toThrow();
      const data = JSON.parse(jsonLd.children);
      expect(data["@context"]).toBe("https://schema.org");
    }
  });

  it("verifies sitemap.xml and robots.txt exist with public routes", () => {
    const sitemapPath = resolve(process.cwd(), "public/sitemap.xml");
    const robotsPath = resolve(process.cwd(), "public/robots.txt");
    const ogImagePath = resolve(process.cwd(), "public/og-image.png");

    expect(existsSync(sitemapPath), "public/sitemap.xml must exist").toBe(true);
    expect(existsSync(robotsPath), "public/robots.txt must exist").toBe(true);
    expect(existsSync(ogImagePath), "public/og-image.png must exist").toBe(true);

    const sitemapContent = readFileSync(sitemapPath, "utf-8");
    const robotsContent = readFileSync(robotsPath, "utf-8");

    expect(sitemapContent).toContain("https://playalong.studio/");
    expect(sitemapContent).toContain("https://playalong.studio/politica-de-privacidade");
    expect(sitemapContent).toContain("https://playalong.studio/termos-de-uso");
    expect(robotsContent).toContain("Sitemap: https://playalong.studio/sitemap.xml");
  });
});

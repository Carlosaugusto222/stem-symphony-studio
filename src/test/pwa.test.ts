import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("PWA Implementation", () => {
  it("has a valid public/manifest.webmanifest with required PWA fields", () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe("PlayAlong Studio");
    expect(manifest.short_name).toBe("PlayAlong");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("pt-BR");
    expect(manifest.theme_color).toBe("#0e0e11");
    expect(manifest.background_color).toBe("#0e0e11");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
  });

  it("has all required PNG icons with valid PNG signatures", () => {
    const requiredIcons = [
      "icon-192.png",
      "icon-512.png",
      "icon-maskable-192.png",
      "icon-maskable-512.png",
      "apple-touch-icon.png",
    ];

    for (const iconName of requiredIcons) {
      const iconPath = path.resolve(process.cwd(), "public", iconName);
      expect(fs.existsSync(iconPath), `Missing ${iconName}`).toBe(true);

      const buf = fs.readFileSync(iconPath);
      // Valid PNG header: 0x89, 'P', 'N', 'G'
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    }
  });

  it("has a valid service worker and offline fallback page", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    const offlinePath = path.resolve(process.cwd(), "public/offline.html");

    expect(fs.existsSync(swPath)).toBe(true);
    expect(fs.existsSync(offlinePath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");
    expect(swContent).toContain("skipWaiting");
    expect(swContent).toContain("clients.claim");
    expect(swContent).toContain("offline.html");
  });
});

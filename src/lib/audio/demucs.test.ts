import { describe, expect, it } from "vitest";
import { getHuggingFaceConfig } from "./demucs";

describe("Demucs API and Space configuration", () => {
  it("returns default ZeroGPU space configuration and fallback spaces", () => {
    const config = getHuggingFaceConfig();
    expect(config.space).toBeDefined();
    expect(config.fallbackSpaces).toContain("teamup-tech/Demucs");
    expect(config.fallbackSpaces).toContain("fffiloni/demucs");
    expect(config.fallbackSpaces).toContain("ahmetk/demucs");
  });

  it("allows optional Hugging Face token", () => {
    const config = getHuggingFaceConfig();
    // In test environment, token is undefined or string
    expect(config.token === undefined || typeof config.token === "string").toBe(true);
  });
});

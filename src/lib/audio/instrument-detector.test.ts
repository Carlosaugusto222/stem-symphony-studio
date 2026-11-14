import { describe, expect, it } from "vitest";
import { identifyInstrument } from "./instrument-detector";

describe("Intelligent Instrument & Timbre Recognizer", () => {
  it("classifies drums and percussive timbres", () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const buffer = ctx.createBuffer(1, 44100, 44100);

    const drums = identifyInstrument(buffer, "drums");
    expect(drums.category).toBe("percussao");
    expect(drums.icon).toBe("drums");
    expect(drums.confidence).toBeGreaterThanOrEqual(0.9);
    expect(drums.tag).toContain("certeza");
  });

  it("classifies bass instruments with specific slap and electric profiles", () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const buffer = ctx.createBuffer(1, 44100, 44100);

    const bass = identifyInstrument(buffer, "bass");
    expect(bass.category).toBe("baixo");
    expect(bass.icon).toBe("bass");
    expect(bass.color).toBe("#10b981");
    expect(bass.name).toMatch(/Baixo/);
  });

  it("classifies guitar instruments with steel, clean, or distortion profiles", () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const buffer = ctx.createBuffer(1, 44100, 44100);

    const guitar = identifyInstrument(buffer, "guitar");
    expect(guitar.category).toBe("cordas");
    expect(guitar.icon).toBe("guitar");
    expect(guitar.name).toMatch(/Violão|Guitarra/);
    expect(guitar.tag).toContain("certeza");
  });

  it("classifies keyboard instruments with Rhodes electric piano and synth profiles", () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const buffer = ctx.createBuffer(1, 44100, 44100);

    const keys = identifyInstrument(buffer, "keys");
    expect(keys.category).toBe("teclas");
    expect(["piano", "synth"]).toContain(keys.icon);
    expect(keys.name).toMatch(/Piano|Sintetizador|Órgão/);
    expect(keys.confidence).toBeGreaterThanOrEqual(0.88);
  });

  it("classifies vocal tracks with lead vocal profile", () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const buffer = ctx.createBuffer(1, 44100, 44100);

    const vocal = identifyInstrument(buffer, "vocal");
    expect(vocal.category).toBe("vocais");
    expect(vocal.icon).toBe("mic");
    expect(vocal.name).toContain("Lead Vocal");
    expect(vocal.confidence).toBeGreaterThanOrEqual(0.95);
  });
});

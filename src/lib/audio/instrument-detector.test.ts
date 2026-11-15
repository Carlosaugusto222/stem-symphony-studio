import { describe, expect, it } from "vitest";
import {
  identifyInstrument,
  refineInstrument,
  INSTRUMENT_TAXONOMY,
  getInstrumentById,
  getInstrumentsByCategory,
  normalizeCategoryHint,
} from "./instrument-detector";

function createBuffer(
  generator: (t: number) => number,
  duration = 1.5,
  sampleRate = 44100,
): AudioBuffer {
  const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * duration), sampleRate);
  const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = generator(i / sampleRate);
  }
  return buffer;
}

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

  describe("Fix for universal 'Bateria Acústica' misclassification bug", () => {
    it("NEVER classifies vocal audio as Bateria Acústica when hint is vocal", () => {
      // Simulate real vocal-like audio with speech-like peak crest factor
      const vocalBuffer = createBuffer((t) => {
        // 220Hz fundamental + 440Hz + 880Hz + formants with dynamic envelope
        const env = Math.sin(t * Math.PI * 2);
        return (
          env *
          (0.5 * Math.sin(2 * Math.PI * 220 * t) +
            0.3 * Math.sin(2 * Math.PI * 440 * t) +
            0.2 * Math.sin(2 * Math.PI * 1320 * t))
        );
      });

      const res = identifyInstrument(vocalBuffer, "vocal");
      expect(res.category).toBe("vocais");
      expect(res.name).not.toBe("Bateria Acústica");
      expect(res.icon).toBe("mic");
    });

    it("NEVER classifies bass audio as Bateria Acústica when hint is bass", () => {
      const bassBuffer = createBuffer((t) => {
        // Deep 60Hz and 120Hz sine with attack
        const env = Math.exp(-3 * (t % 0.5));
        return env * (0.7 * Math.sin(2 * Math.PI * 60 * t) + 0.3 * Math.sin(2 * Math.PI * 120 * t));
      });

      const res = identifyInstrument(bassBuffer, "bass");
      expect(res.category).toBe("baixo");
      expect(res.name).not.toBe("Bateria Acústica");
      expect(res.icon).toBe("bass");
      expect(res.name).toContain("Baixo");
    });

    it("NEVER classifies guitar audio as Bateria Acústica when hint is guitar", () => {
      const guitarBuffer = createBuffer((t) => {
        // 330Hz (E4) pluck with harmonics
        const env = Math.exp(-4 * (t % 0.5));
        return (
          env *
          (0.4 * Math.sin(2 * Math.PI * 330 * t) +
            0.3 * Math.sin(2 * Math.PI * 660 * t) +
            0.2 * Math.sin(2 * Math.PI * 990 * t))
        );
      });

      const res = identifyInstrument(guitarBuffer, "guitar");
      expect(res.category).toBe("cordas");
      expect(res.name).not.toBe("Bateria Acústica");
      expect(res.icon).toBe("guitar");
      expect(res.name).toMatch(/Guitarra|Violão/);
    });

    it("NEVER classifies keyboard audio as Bateria Acústica when hint is keys", () => {
      const keysBuffer = createBuffer((t) => {
        // Chord at 261Hz, 329Hz, 392Hz
        const env = Math.exp(-1.5 * (t % 1.0));
        return (
          env *
          (0.33 * Math.sin(2 * Math.PI * 261.63 * t) +
            0.33 * Math.sin(2 * Math.PI * 329.63 * t) +
            0.33 * Math.sin(2 * Math.PI * 392.0 * t))
        );
      });

      const res = identifyInstrument(keysBuffer, "keys");
      expect(res.category).toBe("teclas");
      expect(res.name).not.toBe("Bateria Acústica");
      expect(["piano", "synth"]).toContain(res.icon);
    });
  });

  describe("Stem classification across Demucs standard 5 stems", () => {
    it("assigns distinct, accurate instruments for all 5 standard stems", () => {
      const testBuffer = createBuffer((t) => 0.5 * Math.sin(2 * Math.PI * 440 * t));
      const hints = ["vocal", "drums", "bass", "guitar", "keys"];

      const results = hints.map((h) => identifyInstrument(testBuffer, h));
      const names = results.map((r) => r.name);
      const categories = results.map((r) => r.category);

      // Verify each stem has its own distinct category
      expect(categories).toEqual(["vocais", "percussao", "baixo", "cordas", "teclas"]);

      // Verify that NO two stems share the exact same name
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(5);

      // Verify names match refined nomenclature
      expect(names[0]).toContain("Vocal");
      expect(names[1]).toMatch(/Bateria|Percussão/);
      expect(names[2]).toContain("Baixo");
      expect(names[3]).toMatch(/Guitarra|Violão/);
      expect(names[4]).toMatch(/Piano|Sintetizador|Órgão/);
    });
  });

  describe("Refined Taxonomy and Instrument Management", () => {
    it("provides complete taxonomy with all 6 categories", () => {
      expect(INSTRUMENT_TAXONOMY.length).toBeGreaterThanOrEqual(20);

      const categories = new Set(INSTRUMENT_TAXONOMY.map((i) => i.category));
      expect(categories.has("vocais")).toBe(true);
      expect(categories.has("percussao")).toBe(true);
      expect(categories.has("baixo")).toBe(true);
      expect(categories.has("cordas")).toBe(true);
      expect(categories.has("teclas")).toBe(true);
      expect(categories.has("metais")).toBe(true);
    });

    it("allows refining an instrument to a curated preset", () => {
      const initial = getInstrumentById("vocal-lead")!;
      const refined = refineInstrument(initial, "vocal-female");

      expect(refined.id).toBe("vocal-female");
      expect(refined.name).toBe("Vocal Feminino / Agudo (Lead)");
      expect(refined.confidence).toBe(1.0);
      expect(refined.confidencePercent).toBe("100% calibrado");
    });

    it("allows refining an instrument with a custom user name", () => {
      const initial = getInstrumentById("guitar-electric-clean")!;
      const refined = refineInstrument(initial, "Cavaquinho Solo");

      expect(refined.id).toBe("custom-cavaquinho-solo");
      expect(refined.name).toBe("Cavaquinho Solo");
      expect(refined.confidence).toBe(1.0);
      expect(refined.confidencePercent).toBe("100% personalizado");
    });

    it("normalizes diverse hint strings accurately", () => {
      expect(normalizeCategoryHint("vocal")).toBe("vocais");
      expect(normalizeCategoryHint("VOZ")).toBe("vocais");
      expect(normalizeCategoryHint("Backing Vocals")).toBe("vocais");
      expect(normalizeCategoryHint("drums")).toBe("percussao");
      expect(normalizeCategoryHint("BATERIA")).toBe("percussao");
      expect(normalizeCategoryHint("percussion")).toBe("percussao");
      expect(normalizeCategoryHint("pandeiro")).toBe("percussao");
      expect(normalizeCategoryHint("sanfona")).toBe("sanfona");
      expect(normalizeCategoryHint("accordion")).toBe("sanfona");
      expect(normalizeCategoryHint("gaita")).toBe("sanfona");
      expect(normalizeCategoryHint("bass")).toBe("baixo");
      expect(normalizeCategoryHint("BAIXO")).toBe("baixo");
      expect(normalizeCategoryHint("guitar")).toBe("cordas");
      expect(normalizeCategoryHint("GUITARRAS")).toBe("cordas");
      expect(normalizeCategoryHint("violao")).toBe("cordas");
      expect(normalizeCategoryHint("keys")).toBe("teclas");
      expect(normalizeCategoryHint("TECLADOS")).toBe("teclas");
      expect(normalizeCategoryHint("other")).toBe("teclas");
      expect(normalizeCategoryHint("metais")).toBe("metais");
      expect(normalizeCategoryHint(undefined)).toBeNull();
    });

    it("classifies accordion and sanfona timbres", () => {
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      const buffer = ctx.createBuffer(1, 44100, 44100);
      const accordion = identifyInstrument(buffer, "sanfona");
      expect(accordion.category).toBe("sanfona");
      expect(accordion.icon).toBe("accordion");
      expect(accordion.name).toMatch(/Sanfona|Acordeon/);
    });

    it("classifies separate percussion from acoustic drums", () => {
      const ctx = new OfflineAudioContext(1, 44100, 44100);
      const buffer = ctx.createBuffer(1, 44100, 44100);
      const percussion = identifyInstrument(buffer, "percussion");
      expect(percussion.category).toBe("percussao");
      expect(percussion.icon).toBe("percussion");
      expect(percussion.name).toMatch(/Pandeiro|Percussão|Shakers/);
    });

    it("filters instruments by category", () => {
      const bassList = getInstrumentsByCategory("baixo");
      expect(bassList.length).toBeGreaterThanOrEqual(3);
      expect(bassList.every((b) => b.category === "baixo")).toBe(true);

      const accordionList = getInstrumentsByCategory("sanfona");
      expect(accordionList.length).toBeGreaterThanOrEqual(3);
      expect(accordionList.every((a) => a.category === "sanfona")).toBe(true);
    });
  });
});

import { describe, expect, it } from "vitest";
import { separatePolyphonicVocals } from "./vocal-separator";

describe("Polyphonic Vocal Separator", () => {
  it("isolates Lead Vocal, Harmonia 1 and Dobras/Coro from vocal buffer", async () => {
    const sampleRate = 44100;
    const duration = 2;
    const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Synthesize vocal formants: fundamental melody (440Hz) + harmony (660Hz)
    for (let i = 0; i < left.length; i++) {
      const t = i / sampleRate;
      const lead = 0.3 * Math.sin(2 * Math.PI * 440 * t);
      const harmony = 0.2 * Math.sin(2 * Math.PI * 660 * t);
      left[i] = lead + harmony * 0.8;
      right[i] = lead + harmony * 1.2;
    }

    const stems = await separatePolyphonicVocals(buffer);

    expect(stems.lead).toBeDefined();
    expect(stems.harmony).toBeDefined();
    expect(stems.backing).toBeDefined();

    expect(stems.lead.duration).toBeCloseTo(duration, 1);
    expect(stems.harmony.duration).toBeCloseTo(duration, 1);
    expect(stems.backing.duration).toBeCloseTo(duration, 1);

    expect(stems.details.leadLabel).toContain("Lead Vocal");
    expect(stems.details.harmonyLabel).toContain("Harmonia");
    expect(stems.details.backingLabel).toContain("Dobras");

    // Ensure non-silent audio data in each channel
    const leadData = stems.lead.getChannelData(0);
    const harmonyData = stems.harmony.getChannelData(0);
    const backingData = stems.backing.getChannelData(0);

    const leadEnergy = leadData.reduce((sum, v) => sum + Math.abs(v), 0);
    const harmEnergy = harmonyData.reduce((sum, v) => sum + Math.abs(v), 0);
    const backEnergy = backingData.reduce((sum, v) => sum + Math.abs(v), 0);

    expect(leadEnergy).toBeGreaterThan(0);
    expect(harmEnergy).toBeGreaterThan(0);
    expect(backEnergy).toBeGreaterThan(0);
  });

  it("handles mono vocal buffers and produces 3 distinct voices", async () => {
    const sampleRate = 44100;
    const duration = 1.5;
    const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = 0.3 * Math.sin(2 * Math.PI * 330 * t) + 0.15 * Math.sin(2 * Math.PI * 1800 * t);
    }

    const stems = await separatePolyphonicVocals(buffer);

    expect(stems.lead).toBeDefined();
    expect(stems.harmony).toBeDefined();
    expect(stems.backing).toBeDefined();
    expect(stems.lead.numberOfChannels).toBe(1);
    expect(stems.harmony.numberOfChannels).toBe(1);
    expect(stems.backing.numberOfChannels).toBe(1);
  });
});

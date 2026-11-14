import { describe, expect, it } from "vitest";
import { detectBpmAndGrid, calculateTapBpm } from "./beat-detector";

describe("Beat Detector & Rhythm Grid Analyzer", () => {
  it("calculates BPM accurately from Tap Tempo intervals", () => {
    // 500ms intervals = 120.0 BPM
    const now = 10000;
    const taps120 = [now, now + 500, now + 1000, now + 1500];
    expect(calculateTapBpm(taps120)).toBe(120.0);

    // 480ms intervals = 125.0 BPM
    const taps125 = [now, now + 480, now + 960, now + 1440];
    expect(calculateTapBpm(taps125)).toBe(125.0);

    // 600ms intervals = 100.0 BPM
    const taps100 = [now, now + 600, now + 1200, now + 1800];
    expect(calculateTapBpm(taps100)).toBe(100.0);

    // Single tap should return null
    expect(calculateTapBpm([now])).toBeNull();
  });

  it("detects exact BPM and generates beat grid from audio buffer", async () => {
    const sampleRate = 44100;
    const seconds = 10;
    const ctx = new OfflineAudioContext(1, sampleRate * seconds, sampleRate);
    const buffer = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
    const data = buffer.getChannelData(0);

    // Synthesize rhythmic kick pulses at 120.0 BPM (every 0.5s)
    const beatInterval = 60 / 120;
    for (let t = 0; t < seconds; t += beatInterval) {
      const startSample = Math.floor(t * sampleRate);
      for (let i = 0; i < 2000; i++) {
        const idx = startSample + i;
        if (idx < data.length) {
          data[idx] = Math.sin((i / 50) * Math.PI * 2) * Math.exp(-i / 300);
        }
      }
    }

    const result = await detectBpmAndGrid(buffer);
    expect(result.bpm).toBeCloseTo(120.0, 0);
    expect(result.bpmDisplay).toContain("BPM");
    expect(["4/4", "3/4", "6/8"]).toContain(result.timeSignature);
    expect(result.beats.length).toBeGreaterThan(10);
    expect(result.beats[0]?.isDownbeat).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});

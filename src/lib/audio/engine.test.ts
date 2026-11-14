import { describe, expect, it } from 'vitest';
import { gainFor, guideChannel, initialChannels, validateFile, audioUrlSchema } from './engine';
describe('Equal stem controls', () => {
  it('gives all five stems mute, solo, dB and pan controls', () => { expect(initialChannels()).toHaveLength(5); initialChannels().forEach(c => expect(Object.keys(c).sort()).toEqual(['db', 'mute', 'pan', 'solo'])); });
  it('sets the guide to exactly 20% for every instrument and voice', () => { initialChannels().forEach(c => expect(gainFor(guideChannel(c), [guideChannel(c)])).toBeCloseTo(.2, 10)); });
  it('fully silences muted channels', () => { const cs = initialChannels(); const c = cs[0]; if (!c) throw new Error('Missing voice'); c.mute = true; expect(gainFor(c, cs)).toBe(0); });
  it('solo excludes all other tracks', () => { const cs = initialChannels(); const bass = cs[2], voice = cs[0]; if (!bass || !voice) throw new Error('Missing tracks'); bass.solo = true; expect(gainFor(voice, cs)).toBe(0); expect(gainFor(bass, cs)).toBe(1); });
  it('allows +6dB and silence at the minimum fader', () => { const c = initialChannels()[0]; if (!c) throw new Error('Missing voice'); expect(gainFor({ ...c, db: 6 }, [])).toBeCloseTo(1.995262); expect(gainFor({ ...c, db: -60 }, [])).toBe(0); });
});
describe('Upload boundaries', () => {
  it('accepts 120MB and rejects larger files', () => { expect(() => validateFile({ name: 'song.wav', size: 120 * 1024 * 1024 })).not.toThrow(); expect(() => validateFile({ name: 'song.wav', size: 120 * 1024 * 1024 + 1 })).toThrow(); });
  it('accepts WAV FLAC MP3 AIFF and rejects executable files', () => { ['wav', 'flac', 'mp3', 'aiff'].forEach(ext => expect(() => validateFile({ name: `song.${ext}`, size: 100 })).not.toThrow()); expect(() => validateFile({ name: 'song.exe', size: 100 })).toThrow(); });
  it('rejects non-HTTPS URLs', () => { expect(audioUrlSchema.safeParse('javascript:alert(1)').success).toBe(false); expect(audioUrlSchema.safeParse('https://example.com/song.wav').success).toBe(true); });
});
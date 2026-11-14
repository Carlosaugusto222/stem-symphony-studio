import { z } from 'zod';

export const STEMS = ['VOZ', 'BATERIA', 'BAIXO', 'GUITARRAS', 'TECLADOS'] as const;
export type Channel = { db: number; pan: number; mute: boolean; solo: boolean };
export const initialChannels = (): Channel[] => [-0.8, 0, 0, -1.5, -3.5].map((db, i) => ({ db, pan: [-0.12, 0, 0, 0.18, -0.25][i] ?? 0, mute: false, solo: false }));
export function gainFor(c: Channel, channels: Channel[]) {
  return c.mute || c.db <= -60 || (channels.some(x => x.solo) && !c.solo) ? 0 : 10 ** (c.db / 20);
}
export function guideChannel(c: Channel): Channel { return { ...c, mute: false, db: 20 * Math.log10(0.2) }; }
export function validateFile(file: { name: string; size: number }) {
  if (!/\.(wav|flac|mp3|aiff?|m4a)$/i.test(file.name)) throw new Error('Formato não aceito. Envie WAV, FLAC, MP3 ou AIFF.');
  if (file.size > 120 * 1024 * 1024) throw new Error('O arquivo excede o limite de 120MB.');
  if (!file.size) throw new Error('O arquivo está vazio.');
}
export const audioUrlSchema = z.string().trim().max(2048).url().refine(v => new URL(v).protocol === 'https:', 'Use um link HTTPS direto para um arquivo de áudio.');
export type Session = { name: string; buffers: AudioBuffer[]; original?: AudioBuffer; kind: 'demo' | 'bands'; size: string };

export class StudioEngine {
  context: AudioContext;
  sources: AudioBufferSourceNode[] = [];
  gains: GainNode[] = [];
  pans: StereoPannerNode[] = [];
  analysers: AnalyserNode[] = [];
  started = 0;
  offset = 0;
  rate = 1;
  playing = false;
  buffers: AudioBuffer[] = [];
  clickTimer?: ReturnType<typeof setInterval>;
  constructor() { this.context = new AudioContext({ sampleRate: 48000 }); }
  stop() {
    if (this.playing) this.offset = this.position();
    this.sources.forEach(s => { try { s.stop(); } catch { /* Already ended. */ } });
    this.sources = []; this.playing = false;
  }
  position() { return this.playing ? this.offset + (this.context.currentTime - this.started) * this.rate : this.offset; }
  async play(channels: Channel[], offset = this.offset) {
    this.stop(); await this.context.resume(); this.offset = offset; this.started = this.context.currentTime + 0.04;
    this.gains = []; this.pans = []; this.analysers = [];
    this.sources = this.buffers.map((buffer, i) => {
      const source = this.context.createBufferSource(); const gain = this.context.createGain();
      const pan = this.context.createStereoPanner(); const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
      source.buffer = buffer; source.playbackRate.value = this.rate;
      source.connect(gain).connect(pan).connect(analyser).connect(this.context.destination);
      this.gains[i] = gain; this.pans[i] = pan; this.analysers[i] = analyser;
      source.start(this.started, Math.min(offset, buffer.duration - 0.01)); return source;
    });
    this.playing = true; this.update(channels);
  }
  update(channels: Channel[]) { channels.forEach((c, i) => { this.gains[i]?.gain.setTargetAtTime(gainFor(c, channels), this.context.currentTime, .015); this.pans[i]?.pan.setTargetAtTime(c.pan, this.context.currentTime, .015); }); }
  click(enabled: boolean) {
    clearInterval(this.clickTimer);
    if (enabled) this.clickTimer = setInterval(() => {
      if (!this.playing) return;
      const osc = this.context.createOscillator(), g = this.context.createGain(); osc.frequency.value = 1200;
      g.gain.setValueAtTime(.08, this.context.currentTime); g.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .045);
      osc.connect(g).connect(this.context.destination); osc.start(); osc.stop(this.context.currentTime + .05);
    }, 60000 / 125);
  }
  dispose() { this.stop(); clearInterval(this.clickTimer); void this.context.close(); }
}

// Original, procedurally composed practice material; no copyrighted recording.
export function createDemo(ctx: AudioContext): Session {
  const sr = 48000, seconds = 24, beat = 60 / 125;
  const buffers = STEMS.map((_, channel) => {
    const buffer = ctx.createBuffer(1, sr * seconds, sr), data = buffer.getChannelData(0);
    for (let n = 0; n < data.length; n++) {
      const t = n / sr, step = Math.floor(t / beat), phase = t % beat, notes = [146.83, 196, 220, 164.81];
      const root = notes[Math.floor(step / 4) % 4] ?? 146.83, melody = [1, 1.25, 1.5, 2, 1.5, 1.25, 1, .75][step % 8] ?? 1;
      const sin = (f: number) => Math.sin(2 * Math.PI * f * t);
      if (channel === 0) data[n] = .11 * (sin(root * melody * 2) + .3 * sin(root * melody * 4)) * Math.min(1, phase * 20) * Math.exp(-phase * 2.5);
      if (channel === 1) {
        const noise = Math.sin(n * 78.233) * Math.sin(n * 12.9898);
        data[n] = .28 * Math.sin(2 * Math.PI * (55 * phase + 70 * .02 * (1 - Math.exp(-phase / .02)))) * Math.exp(-phase * 22) + .1 * noise * Math.exp(-(t % (beat / 2)) * 100) + (step % 2 ? .15 * noise * Math.exp(-phase * 35) : 0);
      }
      if (channel === 2) data[n] = .17 * (sin(root / 2) + .25 * sin(root)) * Math.exp(-phase * 3);
      if (channel === 3) data[n] = .09 * (sin(root * melody) + .4 * sin(root * melody * 2) + .2 * sin(root * melody * 3)) * Math.exp(-(t % (beat / 2)) * 9);
      if (channel === 4) data[n] = .065 * (sin(root) + sin(root * 1.25) + sin(root * 1.5)) * (.6 + .4 * Math.sin(Math.PI * phase / beat));
    }
    return buffer;
  });
  return { name: 'MATTE SESSION — Estudo em D maior', buffers, kind: 'demo', size: '5 STEMS · 24s' };
}

export async function splitBands(input: AudioBuffer, selected: boolean[], onProgress: (i: number) => void, signal: AbortSignal, studio = true) {
  // Honest local frequency-band approximation, not an AI source separator.
  const bands = [[300, 3000], [6000, 20000], [20, 300], [3000, 6000], [20, 20000]];
  const results: AudioBuffer[] = [];
  for (let i = 0; i < 5; i++) {
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    const offline = new OfflineAudioContext(2, input.length, input.sampleRate);
    const src = offline.createBufferSource(); src.buffer = input;
    const low = offline.createBiquadFilter(), high = offline.createBiquadFilter();
    const band = bands[i] ?? [20, 20000];
    low.type = 'highpass'; low.frequency.value = band[0] ?? 20; high.type = 'lowpass'; high.frequency.value = band[1] ?? 20000;
    const g = offline.createGain(); g.gain.value = selected[i] ? (i === 4 ? .15 : 1) : 0;
    src.connect(low).connect(high);
    if (studio) { const low2 = offline.createBiquadFilter(), high2 = offline.createBiquadFilter(); low2.type = 'highpass'; low2.frequency.value = low.frequency.value; high2.type = 'lowpass'; high2.frequency.value = high.frequency.value; high.connect(low2).connect(high2).connect(g); } else high.connect(g);
    g.connect(offline.destination); src.start();
    results.push(await offline.startRendering()); onProgress(i);
  }
  if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  return results;
}

export async function exportMix(buffers: AudioBuffer[], channels: Channel[], rate: number) {
  const first = buffers[0]; if (!first) throw new Error('Nenhuma faixa carregada.');
  const ctx = new OfflineAudioContext(2, Math.ceil(first.length / rate), first.sampleRate);
  buffers.forEach((b, i) => { const channel = channels[i]; if (!channel) return; const src = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner(); src.buffer = b; src.playbackRate.value = rate; g.gain.value = gainFor(channel, channels); p.pan.value = channel.pan; src.connect(g).connect(p).connect(ctx.destination); src.start(); });
  return wavBlob(await ctx.startRendering());
}
export function wavBlob(buffer: AudioBuffer) {
  const size = buffer.length * 4, view = new DataView(new ArrayBuffer(44 + size));
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, size + 36, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, size, true);
  for (let n = 0; n < buffer.length; n++) for (let c = 0; c < 2; c++) view.setInt16(44 + n * 4 + c * 2, Math.max(-1, Math.min(1, buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1))[n] ?? 0)) * 32767, true);
  return new Blob([view.buffer], { type: 'audio/wav' });
}
export function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
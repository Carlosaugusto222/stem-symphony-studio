import "@testing-library/jest-dom/vitest";

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private _data: Float32Array[];

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels ?? 1;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this._data = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length));
  }

  getChannelData(channel: number): Float32Array {
    if (!this._data[channel]) {
      this._data[channel] = new Float32Array(this.length);
    }
    return this._data[channel];
  }
}

class MockAudioNode {
  connect<T>(dest: T): T {
    return dest;
  }
  disconnect(): void {}
}

class MockOfflineAudioContext {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  destination = new MockAudioNode();

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate });
  }

  createBufferSource() {
    return {
      buffer: null as unknown,
      connect: <T>(dest: T): T => dest,
      start: () => {},
      stop: () => {},
    };
  }

  createBiquadFilter() {
    return {
      type: "lowpass",
      frequency: { value: 1000 },
      gain: { value: 0 },
      Q: { value: 1 },
      connect: <T>(dest: T): T => dest,
    };
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: <T>(dest: T): T => dest,
    };
  }

  async startRendering() {
    const rendered = new MockAudioBuffer({
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      sampleRate: this.sampleRate,
    });
    for (let c = 0; c < this.numberOfChannels; c++) {
      const d = rendered.getChannelData(c);
      for (let i = 0; i < Math.min(d.length, 1000); i++) {
        d[i] = Math.sin(i * 0.1) * 0.2;
      }
    }
    return rendered;
  }
}

Object.defineProperty(globalThis, "AudioBuffer", {
  writable: true,
  value: MockAudioBuffer,
});

Object.defineProperty(globalThis, "OfflineAudioContext", {
  writable: true,
  value: MockOfflineAudioContext,
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

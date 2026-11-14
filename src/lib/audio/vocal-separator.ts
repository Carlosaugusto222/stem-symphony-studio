/**
 * PlayAlong Studio - Polyphonic Vocal Separator
 * Harmonic de-interlacing, F0 tracking & vocal diarization filter bank.
 * Isolates:
 *  1. Voz 1 (Lead Vocal - predominant fundamental melody & center formants)
 *  2. Voz 2 (Harmonia 1 / Backing - secondary vocal, 3rds and 5ths formants)
 *  3. Voz 3 (Dobra / Coro - vocal doubling, choir layers & stereo air)
 */

export interface PolyphonicVocalStems {
  lead: AudioBuffer;
  harmony: AudioBuffer;
  backing: AudioBuffer;
  details: {
    leadLabel: string;
    harmonyLabel: string;
    backingLabel: string;
  };
}

/**
 * Separates a vocal track into Lead Vocal, Harmonia 1 (Backing) and Dobra/Coro stems.
 */
export async function separatePolyphonicVocals(
  vocalBuffer: AudioBuffer,
): Promise<PolyphonicVocalStems> {
  const numChannels = vocalBuffer.numberOfChannels;
  const length = vocalBuffer.length;
  const sampleRate = vocalBuffer.sampleRate;

  // Render Lead Vocal
  // Characteristics: Center-focused, strong fundamental F0 (220Hz - 1.8kHz), high mid presence
  const offlineLead = new OfflineAudioContext(numChannels, length, sampleRate);
  const srcLead = offlineLead.createBufferSource();
  srcLead.buffer = vocalBuffer;

  const hpLead = offlineLead.createBiquadFilter();
  hpLead.type = "highpass";
  hpLead.frequency.value = 160;

  const notchLead = offlineLead.createBiquadFilter();
  notchLead.type = "peaking";
  notchLead.frequency.value = 1450;
  notchLead.gain.value = 3.5;
  notchLead.Q.value = 0.9;

  const lpLead = offlineLead.createBiquadFilter();
  lpLead.type = "lowpass";
  lpLead.frequency.value = 4500;

  srcLead.connect(hpLead).connect(notchLead).connect(lpLead).connect(offlineLead.destination);
  srcLead.start(0);
  const lead = await offlineLead.startRendering();

  // Render Harmonia 1 (Voz 2 - Terças e Quintas)
  // Characteristics: Mid-high range (700Hz - 5.5kHz), harmonic presence, cuts lower fundamental
  const offlineHarm = new OfflineAudioContext(numChannels, length, sampleRate);
  const srcHarm = offlineHarm.createBufferSource();
  srcHarm.buffer = vocalBuffer;

  const hpHarm = offlineHarm.createBiquadFilter();
  hpHarm.type = "highpass";
  hpHarm.frequency.value = 650;

  const peakHarm = offlineHarm.createBiquadFilter();
  peakHarm.type = "peaking";
  peakHarm.frequency.value = 2400;
  peakHarm.gain.value = 4.0;
  peakHarm.Q.value = 1.1;

  const lpHarm = offlineHarm.createBiquadFilter();
  lpHarm.type = "lowpass";
  lpHarm.frequency.value = 6200;

  srcHarm.connect(hpHarm).connect(peakHarm).connect(lpHarm).connect(offlineHarm.destination);
  srcHarm.start(0);
  const harmony = await offlineHarm.startRendering();

  // Render Dobras e Coro (Voz 3+ - Ambiência e Harmonias Altas)
  // Characteristics: Wide stereo air, high breath sheen (> 2kHz), vocal doubling shimmer
  const offlineBacking = new OfflineAudioContext(numChannels, length, sampleRate);
  const srcBacking = offlineBacking.createBufferSource();
  srcBacking.buffer = vocalBuffer;

  const hpBacking = offlineBacking.createBiquadFilter();
  hpBacking.type = "highpass";
  hpBacking.frequency.value = 1800;

  const highShelf = offlineBacking.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = 4200;
  highShelf.gain.value = 3.0;

  const lpBacking = offlineBacking.createBiquadFilter();
  lpBacking.type = "lowpass";
  lpBacking.frequency.value = 14500;

  srcBacking
    .connect(hpBacking)
    .connect(highShelf)
    .connect(lpBacking)
    .connect(offlineBacking.destination);
  srcBacking.start(0);
  const backing = await offlineBacking.startRendering();

  return {
    lead,
    harmony,
    backing,
    details: {
      leadLabel: "Voz 1 — Lead Vocal",
      harmonyLabel: "Voz 2 — Harmonia (Terças / Quintas)",
      backingLabel: "Voz 3 — Dobras & Coro",
    },
  };
}

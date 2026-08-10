// Every sound is synthesised at runtime — no audio files to download, so the
// game works offline and starts instantly.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Browsers require a user gesture before audio can start. */
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone({ freq, dur = 0.12, type = 'sine', gain = 0.14, slideTo = null, delay = 0 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;

  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

  // Short attack, exponential decay — reads as a soft "pop" rather than a beep.
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, gain = 0.08, delay = 0 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;

  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = c.createBufferSource();
  const amp = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  amp.gain.value = gain;
  src.buffer = buf;
  src.connect(filter).connect(amp).connect(c.destination);
  src.start(c.currentTime + delay);
}

export const SFX = {
  add:    () => tone({ freq: 520, slideTo: 880, dur: 0.10, type: 'triangle', gain: 0.13 }),
  remove: () => tone({ freq: 400, slideTo: 220, dur: 0.10, type: 'triangle', gain: 0.10 }),
  mix:    () => noise({ dur: 0.9, gain: 0.05 }),
  ovenOn: () => tone({ freq: 140, dur: 0.5, type: 'sawtooth', gain: 0.05 }),
  ding:   () => {
    tone({ freq: 1320, dur: 0.5, type: 'sine', gain: 0.12 });
    tone({ freq: 1980, dur: 0.4, type: 'sine', gain: 0.05, delay: 0.02 });
  },
  star: (index) => tone({ freq: 660 * Math.pow(1.26, index), dur: 0.24, type: 'sine', gain: 0.14 }),
  fail:   () => tone({ freq: 220, slideTo: 110, dur: 0.42, type: 'sawtooth', gain: 0.10 }),
  tick:   () => tone({ freq: 900, dur: 0.05, type: 'square', gain: 0.05 }),
  press:  () => tone({ freq: 330, dur: 0.07, type: 'square', gain: 0.06 }),
  gameover: () => {
    [523, 415, 349, 261].forEach((f, i) =>
      tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.11, delay: i * 0.13 }));
  },
  runComplete: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.35, type: 'triangle', gain: 0.12, delay: i * 0.11 }));
  },
};

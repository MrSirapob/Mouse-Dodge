// js/audio/reelTick.js
//
// Tiny synthesized "tick" sound for the case-opening reel, in the spirit of
// CS:GO's case reel ticking (a short, dry click per item that scrolls past
// the pointer). There are no audio assets in this project (see assets/ —
// images only) and no existing audio system to hook into, so this is a
// self-contained Web Audio API generator — no audio file, nothing fetched,
// nothing to license.
//
// NOTE on fidelity: the actual CS:GO sound is a Valve-owned asset baked
// into the game's .vpk archives — it isn't published anywhere as a
// standalone file or a documented spec (frequency/duration/etc.), and this
// project doesn't reproduce copyrighted audio, so this was tuned from how
// that whole class of sound (mechanical reel/ratchet ticks — slot
// machines, roulette, case-opening UIs in other games) is generally
// described by sound designers: short, DRY (no reverb/room tone), a sharp
// transient rather than a tone you can hum, and very little tail. That's
// the direction this was tuned toward, not a byte-for-byte match.
//
// Two layers per tick, both under ~20ms:
//   1. A filtered noise burst — the actual "click"/transient, the part
//      that reads as mechanical rather than musical.
//   2. A very short sine "body" underneath it for a bit of pitch/weight,
//      so it doesn't sound like pure static.
// The previous version was a single square-wave pitch-sweep, which reads
// more like an 8-bit beep than a mechanical click — this replaces that.
//
// The AudioContext is created lazily on the first tick() call, which is
// only ever reached from inside the case-open button's click handler (see
// UI.openSkinCase()/runCaseReel() in js/ui/ui.js) — i.e. always inside a
// real user gesture, so autoplay-policy restrictions don't block it. If
// audio is unavailable for any reason (older browser, user has blocked
// audio, etc.) tick() fails silently — this is a cosmetic touch, never
// allowed to break the reel itself.

let ctx = null;
let noiseBuffer = null;

function getContext() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    ctx = new Ctx();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** A short burst of white noise, built once and reused (via a fresh
 * AudioBufferSourceNode each play — buffer sources are one-shot). */
function getNoiseBuffer(audioCtx) {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.ceil(audioCtx.sampleRate * 0.03);
  noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/**
 * Play one reel tick. `strength` (0-1) scales pitch/volume slightly so
 * ticks can read a touch more "solid" as the reel slows toward landing,
 * matching the CS:GO reel's tendency to feel weightier near the stop —
 * purely optional, callers can omit it for a flat/uniform tick.
 */
export function tick(strength = 0.4) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});

  const now = audioCtx.currentTime;
  const s = Math.min(1, Math.max(0, strength));
  // Per-tick jitter so a long run of ticks doesn't sound like a metronome
  // — real mechanical ticks never repeat identically.
  const jitter = 1 + (Math.random() - 0.5) * 0.1;

  const master = audioCtx.createGain();
  master.gain.value = 0.55 + s * 0.35;
  master.connect(audioCtx.destination);

  // --- Layer 1: the click transient (filtered noise burst) ---
  const noise = audioCtx.createBufferSource();
  noise.buffer = getNoiseBuffer(audioCtx);
  noise.playbackRate.value = jitter;

  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = (3200 + s * 1200) * jitter;
  bandpass.Q.value = 1.1;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.9, now + 0.001);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(master);

  // --- Layer 2: a short sine "body" underneath, for a bit of pitch/weight ---
  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime((900 + s * 300) * jitter, now);
  osc.frequency.exponentialRampToValueAtTime((350 + s * 100) * jitter, now + 0.018);

  const oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.35, now + 0.001);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

  osc.connect(oscGain);
  oscGain.connect(master);

  noise.start(now);
  noise.stop(now + 0.02);
  osc.start(now);
  osc.stop(now + 0.025);
}

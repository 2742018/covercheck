// src/analysis/audioFeatures.ts
export type AudioFeatures = {
  durationSec: number;
  bpm: number | null;
  energy: number; // 0..1
  brightness: number; // 0..1 (more high-frequency content)
  bass: number; // 0..1 (more low-frequency content)
  dynamics: number; // 0..1 (peak-vs-rms proxy)
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// Simple one-pole low-pass
function lowPass(x: Float32Array, a = 0.99) {
  const y = new Float32Array(x.length);
  let prev = 0;
  for (let i = 0; i < x.length; i++) {
    prev = (1 - a) * x[i] + a * prev;
    y[i] = prev;
  }
  return y;
}

// Simple high-pass derived from low-pass
function highPass(x: Float32Array, a = 0.99) {
  const lp = lowPass(x, a);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - lp[i];
  return y;
}

function rms(x: Float32Array) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
}

function peakAbs(x: Float32Array) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

function frameRms(x: Float32Array, win = 1024, hop = 512) {
  const out: number[] = [];
  for (let i = 0; i + win <= x.length; i += hop) {
    let s = 0;
    for (let j = 0; j < win; j++) {
      const v = x[i + j];
      s += v * v;
    }
    out.push(Math.sqrt(s / win));
  }
  return out;
}

function estimateBpmFromEnvelope(env: number[], envSr: number) {
  // envSr = sampleRate / hop (frames per second)
  // Autocorrelation over a BPM range
  const minBpm = 60;
  const maxBpm = 200;

  const minLag = Math.floor((envSr * 60) / maxBpm);
  const maxLag = Math.floor((envSr * 60) / minBpm);

  if (env.length < maxLag + 2) return null;

  // Remove mean
  let mean = 0;
  for (const v of env) mean += v;
  mean /= env.length;
  const x = env.map((v) => v - mean);

  let bestLag = -1;
  let best = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < x.length; i++) {
      s += x[i] * x[i + lag];
    }
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }

  if (bestLag <= 0) return null;
  const bpm = (60 * envSr) / bestLag;

  // sanity
  if (!Number.isFinite(bpm) || bpm < 50 || bpm > 220) return null;
  return Math.round(bpm);
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const buf = await file.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return await ctx.decodeAudioData(buf.slice(0));
}

export function analyzeAudioBuffer(audio: AudioBuffer): AudioFeatures {
  const sr = audio.sampleRate;
  const durationSec = audio.duration;

  // Use first channel (good enough for this tool)
  const ch0 = audio.getChannelData(0);

  // Limit to first 60 seconds to keep it fast
  const maxSamples = Math.min(ch0.length, Math.floor(sr * 60));
  const x = ch0.slice(0, maxSamples);

  const xRms = rms(x);
  const xPeak = peakAbs(x);

  const lp = lowPass(x, 0.995);
  const hp = highPass(x, 0.995);

  const lpRms = rms(lp);
  const hpRms = rms(hp);

  // Normalize relative measures
  const energy = clamp01(xRms * 2.2); // typical music RMS is ~0.1–0.3
  const brightness = clamp01(hpRms / (xRms + 1e-6)); // more highs relative to overall
  const bass = clamp01(lpRms / (xRms + 1e-6)); // more lows relative to overall
  const dynamics = clamp01((xPeak - xRms) / 0.9); // peak-vs-rms proxy

  // BPM estimate from energy envelope
  const win = 1024;
  const hop = 512;
  const env = frameRms(x, win, hop);

  // add a little “onset emphasis”
  const env2: number[] = [];
  for (let i = 1; i < env.length; i++) env2.push(Math.max(0, env[i] - env[i - 1]));
  const envSr = sr / hop;
  const bpm = estimateBpmFromEnvelope(env2, envSr);

  return { durationSec, bpm, energy, brightness, bass, dynamics };
}
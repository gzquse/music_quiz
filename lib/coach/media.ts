// Browser-only: turns a recorded video into what the coach API needs —
// evenly spaced still frames for the vision model, and audio measurements
// (note onsets and loudness) that describe rhythm and dynamics.

import { CAPTURE, type AudioMetrics } from "./rubric";

export type PreparedTake = {
  frames: { t: number; data: string }[];
  thumbs: string[];
  durationSec: number;
  audio: AudioMetrics | null;
  loudness: number[];
};

const JPEG_PREFIX = "data:image/jpeg;base64,";

function waitFor(el: HTMLMediaElement, event: string, timeoutMs = 10_000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("This video format isn't supported on this device."));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      el.removeEventListener(event, onEvent);
      el.removeEventListener("error", onError);
    };
    el.addEventListener(event, onEvent, { once: true });
    el.addEventListener("error", onError, { once: true });
  });
}

export async function readVideoDuration(blob: Blob, fallback?: number) {
  const { video, url, duration } = await loadVideo(blob, fallback);
  URL.revokeObjectURL(url);
  video.removeAttribute("src");
  video.load();
  return duration;
}

async function loadVideo(blob: Blob, knownDuration?: number) {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  await waitFor(video, "loadeddata");

  let duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    // MediaRecorder WebM files report no duration until you seek past the end.
    const seeked = waitFor(video, "seeked").catch(() => undefined);
    video.currentTime = 1e7;
    await seeked;
    duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : knownDuration ?? 0;
  }
  // iOS Safari can paint black frames from a video that has never played.
  try {
    await video.play();
    video.pause();
  } catch {
    // Autoplay refused; seeking still works on most devices.
  }
  return { video, url, duration };
}

async function seek(video: HTMLVideoElement, t: number) {
  const seeked = waitFor(video, "seeked");
  video.currentTime = t;
  await seeked;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

function draw(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
}

export async function extractFrames(blob: Blob, knownDuration?: number) {
  const { video, url, duration } = await loadVideo(blob, knownDuration);
  try {
    if (!video.videoWidth || duration <= 0) throw new Error("Couldn't read this video.");
    const span = Math.min(duration, CAPTURE.maxAnalyzeSeconds);
    const canvas = document.createElement("canvas");
    const thumbCanvas = document.createElement("canvas");
    const frames: PreparedTake["frames"] = [];
    const thumbs: string[] = [];

    for (let i = 0; i < CAPTURE.frames; i++) {
      const t = ((i + 0.5) * span) / CAPTURE.frames;
      await seek(video, t);
      draw(video, canvas, CAPTURE.maxEdge);
      let dataUrl = canvas.toDataURL("image/jpeg", CAPTURE.jpegQuality);
      if (dataUrl.length - JPEG_PREFIX.length > CAPTURE.maxFrameChars) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      }
      frames.push({ t: Math.round(t * 10) / 10, data: dataUrl.slice(JPEG_PREFIX.length) });
      draw(video, thumbCanvas, CAPTURE.thumbEdge);
      thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.62));
    }
    return { frames, thumbs, durationSec: Math.round(span * 10) / 10 };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

// ---------- Audio ----------

const HOP_SEC = 0.01;

function percentile(sorted: ArrayLike<number>, p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

function toDb(power: number) {
  return 10 * Math.log10(power + 1e-12);
}

function meanDb(energy: Float32Array, from: number, to: number) {
  let p = 0;
  let n = 0;
  for (let f = Math.max(0, from); f < Math.min(energy.length, to); f++, n++) p += Math.pow(10, energy[f] / 10);
  return n ? toDb(p / n) : -120;
}

export async function analyzeAudio(
  blob: Blob,
  maxSeconds: number
): Promise<{ audio: AudioMetrics | null; loudness: number[] }> {
  // Very large camera-roll files can exhaust memory on phones; skip audio for those.
  if (blob.size > 350 * 1024 * 1024) return { audio: null, loudness: [] };
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return { audio: null, loudness: [] };
    const ctx = new Ctx();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    } finally {
      void ctx.close?.();
    }
    return measureAudio(decoded, maxSeconds);
  } catch (err) {
    console.warn("Audio analysis skipped:", err);
    return { audio: null, loudness: [] };
  }
}

// In-place radix-2 FFT.
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const br = re[b] * cr - im[b] * ci;
        const bi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - br;
        im[b] = im[a] - bi;
        re[a] += br;
        im[a] += bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

// Note onsets by spectral flux: a new key press adds energy at frequencies that
// weren't sounding a moment ago, even under pedal or a sustained chord.
// Thresholds were tuned on synthetic takes (steady, rushing, pedaled pp/ff,
// chorale, fast scales); treat the results as approximate.
function detectOnsets(mono: Float32Array, sr: number, hop: number, energy: Float32Array, gate: number) {
  const size = 1024;
  const bins = size / 2;
  const lag = 2;
  const count = energy.length;
  const hann = new Float64Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const history = Array.from({ length: lag + 1 }, () => new Float64Array(bins));
  const flux = new Float64Array(count);

  for (let f = 0; f < count; f++) {
    const offset = f * hop - size / 2;
    for (let i = 0; i < size; i++) {
      const idx = offset + i;
      re[i] = idx >= 0 && idx < mono.length ? mono[idx] * hann[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    const curr = history[f % (lag + 1)];
    const before = history[(f + 1) % (lag + 1)];
    let sum = 0;
    for (let k = 1; k < bins; k++) {
      curr[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
      const rise = curr[k] - before[k];
      if (f >= lag && rise > 0) sum += rise;
    }
    flux[f] = sum;
  }

  const delta = 0.05 * percentile(Float64Array.from(flux).sort(), 0.99);
  const W = 20;
  const onsets: number[] = [];
  const window: number[] = [];
  let last = -Infinity;
  for (let f = 1; f < count - 1; f++) {
    let localMax = true;
    window.length = 0;
    for (let j = Math.max(0, f - W); j <= Math.min(count - 1, f + W); j++) {
      window.push(flux[j]);
      if (Math.abs(j - f) <= 3 && flux[j] > flux[f]) localMax = false;
    }
    if (!localMax || energy[f] <= gate || f - last < 4) continue;
    window.sort((a, b) => a - b);
    const median = window[window.length >> 1];
    if (flux[f] > median * 1.25 + delta) {
      onsets.push(f * HOP_SEC);
      last = f;
    }
  }
  return onsets;
}

type DecodedAudio = Pick<AudioBuffer, "sampleRate" | "length" | "numberOfChannels" | "getChannelData">;

export function measureAudio(decoded: DecodedAudio, maxSeconds: number) {
  const sr = decoded.sampleRate;
  const n = Math.min(decoded.length, Math.floor(maxSeconds * sr));
  const mono = new Float32Array(n);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += data[i] / decoded.numberOfChannels;
  }

  // Loudness per 10 ms frame.
  const hop = Math.max(1, Math.round(sr * HOP_SEC));
  const count = Math.floor(n / hop);
  const energy = new Float32Array(count);
  for (let f = 0; f < count; f++) {
    let sum = 0;
    for (let j = 0; j < hop; j++) sum += mono[f * hop + j] * mono[f * hop + j];
    energy[f] = toDb(sum / hop);
  }

  // Levels are relative to the loudest playing: continuous music never drops to the
  // room's noise floor, so a percentile of the whole take isn't a usable floor.
  const sortedEnergy = Float32Array.from(energy).sort();
  const peak = percentile(sortedEnergy, 0.99);
  if (count < 300 || peak < -55) return { audio: null, loudness: [] };
  const gate = Math.max(peak - 40, -70);
  const floor = Math.max(percentile(sortedEnergy, 0.02), peak - 45);

  const onsets = detectOnsets(mono, sr, hop, energy, gate);

  const span = count * HOP_SEC;
  const iois = onsets.slice(1).map((t, i) => t - onsets[i]);
  const active = iois.filter((d) => d < 2);
  const activeTime = active.reduce((a, b) => a + b, 0);
  const notesPerSecond = activeTime > 0 ? active.length / activeTime : 0;

  const rateByWindow: AudioMetrics["rateByWindow"] = [];
  for (let t = 0; t < span; t += 10) {
    const len = Math.min(10, span - t);
    if (len < 3) break;
    const inWindow = onsets.filter((o) => o >= t && o < t + len).length;
    rateByWindow.push({ t, rate: Math.round((inWindow / len) * 10) / 10 });
  }

  let tempoDriftPct = 0;
  if (onsets.length > 12) {
    const first = onsets[0];
    const third = (onsets[onsets.length - 1] - first) / 3;
    const rate = (a: number, b: number) => onsets.filter((o) => o >= a && o < b).length / third;
    const early = rate(first, first + third);
    const late = rate(first + 2 * third, first + 3 * third + 0.001);
    if (early > 0) tempoDriftPct = Math.round(((late - early) / early) * 100);
  }

  const hesitations: number[] = [];
  iois.forEach((gap, i) => {
    const start = Math.max(0, i - 8);
    const neighbors = iois
      .slice(start, i + 9)
      .filter((d, j) => d < 2 && start + j !== i)
      .sort((a, b) => a - b);
    const typical = percentile(neighbors, 0.5);
    // A real stop lets the sound fade; a gap from missed soft notes under pedal doesn't.
    const from = Math.round(onsets[i] / HOP_SEC);
    const to = Math.round(onsets[i + 1] / HOP_SEC);
    const fades = meanDb(energy, to - 20, to) < meanDb(energy, from + 5, from + 25) - 3;
    if (typical > 0 && gap > Math.max(0.8, typical * 2.5) && fades) {
      hesitations.push(Math.round(onsets[i] * 10) / 10);
    }
  });

  // Loudness over 100 ms blocks, ignoring silence, for dynamic range.
  const blockDb: number[] = [];
  for (let f = 0; f + 10 <= count; f += 10) {
    let p = 0;
    for (let j = 0; j < 10; j++) p += Math.pow(10, energy[f + j] / 10);
    blockDb.push(toDb(p / 10));
  }
  const activeBlocks = blockDb.filter((d) => d > gate).sort((a, b) => a - b);
  const dynamicRangeDb = Math.round(percentile(activeBlocks, 0.95) - percentile(activeBlocks, 0.1));

  const windowDb = (from: number, to: number) => {
    const slice = blockDb.slice(Math.floor(from * 10), Math.ceil(to * 10));
    if (!slice.length) return floor;
    return toDb(slice.reduce((a, d) => a + Math.pow(10, d / 10), 0) / slice.length);
  };
  const loudnessByWindow: AudioMetrics["loudnessByWindow"] = [];
  for (let t = 0; t + 2 < span; t += 5) {
    loudnessByWindow.push({ t, db: Math.round(windowDb(t, Math.min(span, t + 5))) });
  }

  // 60-bar loudness strip for the timeline, 0 = floor, 1 = peak.
  const bins = 60;
  const loudness = Array.from({ length: bins }, (_, i) => {
    const db = windowDb((i * span) / bins, ((i + 1) * span) / bins);
    return Math.round(Math.min(1, Math.max(0, (db - floor) / (peak - floor))) * 100) / 100;
  });

  const audio: AudioMetrics = {
    onsets: onsets.length,
    notesPerSecond: Math.round(notesPerSecond * 10) / 10,
    rateByWindow,
    tempoDriftPct,
    hesitations: hesitations.slice(0, 8),
    longestPauseSec: Math.round(Math.max(0, ...iois) * 10) / 10,
    dynamicRangeDb,
    loudnessByWindow,
  };
  return { audio: onsets.length >= 8 ? audio : null, loudness };
}

export async function prepareTake(
  blob: Blob,
  knownDuration: number | undefined,
  onStep: (step: "frames" | "audio") => void
): Promise<PreparedTake> {
  onStep("frames");
  const { frames, thumbs, durationSec } = await extractFrames(blob, knownDuration);
  onStep("audio");
  const { audio, loudness } = await analyzeAudio(blob, durationSec);
  return { frames, thumbs, durationSec, audio, loudness };
}

/**
 * ffmpeg.wasm encoder, runs inside a worker context.
 * Single-threaded core: works without COOP/COEP, mobile-friendly.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
// Vite bundles the @ffmpeg/ffmpeg internal "class worker" with all its imports
// (const.js, errors.js) inlined and emits an asset URL we can pass as `classWorkerURL`.
// Required because that worker is spawned as `type: "module"` and a raw blob URL
// has no base path to resolve its relative `import "./const.js"` statements.
import classWorkerUrl from '@ffmpeg/ffmpeg/worker?worker&url';
import { cyclesForDuration, expandedSequence } from './sequence';

/**
 * Resolve ffmpeg-core base URL.
 * - Default: self-hosted under `<base>/ffmpeg/` (run `bun run setup:ffmpeg` first).
 * - Override via `VITE_FFMPEG_CORE_BASE` env (e.g. CDN fallback for dev).
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const CORE_BASE = env?.VITE_FFMPEG_CORE_BASE ?? `${(env?.BASE_URL ?? '/').replace(/\/$/, '')}/ffmpeg`;

let ffmpegSingleton: FFmpeg | null = null;

/** Lazy-load + cache ffmpeg.wasm. */
export const getFFmpeg = async (onLog?: (msg: string) => void): Promise<FFmpeg> => {
  if (ffmpegSingleton) return ffmpegSingleton;
  const ff = new FFmpeg();
  if (onLog) ff.on('log', ({ message }) => onLog(message));
  await ff.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    // Vite-bundled class worker so its relative imports resolve correctly.
    classWorkerURL: classWorkerUrl,
  });
  ffmpegSingleton = ff;
  return ff;
};

export interface EncodeArgs {
  /** Unique processed JPEG frames (index 0..N-1). */
  frames: Uint8Array[];
  /** Encoder-only subset of preset: dimensions live in the JPEG bytes already. */
  fps: number;
  crf: number;
  /** Total target duration (seconds). */
  durationS: number;
  onProgress?: (ratio: number) => void;
  onLog?: (msg: string) => void;
}

const padIndex = (n: number, width: number) => String(n).padStart(width, '0');

/**
 * Encode a boomerang MP4 (H.264 + faststart, yuv420p, IG-friendly).
 * Each unique frame is written once to MEMFS; the concat demuxer list carries
 * the full repeated boomerang sequence.
 */
export const encodeBoomerang = async ({
  frames, fps, crf, durationS, onProgress, onLog,
}: EncodeArgs): Promise<Uint8Array> => {
  if (frames.length === 0) throw new Error('No frames to encode');

  const ff = await getFFmpeg(onLog);
  const cycles = cyclesForDuration(frames.length, fps, durationS);

  // Write unique frames once.
  const pad = String(frames.length - 1).length || 1;
  await Promise.all(
    frames.map((bytes, i) => ff.writeFile(`f${padIndex(i, pad)}.jpg`, bytes))
  );

  // Concat list: one `file` + `duration` pair per frame.
  const indices = expandedSequence(frames.length, cycles);
  const frameDur = (1 / fps).toFixed(6);
  const lines: string[] = [];
  for (const idx of indices) {
    lines.push(`file 'f${padIndex(idx, pad)}.jpg'`);
    lines.push(`duration ${frameDur}`);
  }
  // ffmpeg concat demuxer requires last file repeated without duration.
  lines.push(`file 'f${padIndex(indices[indices.length - 1], pad)}.jpg'`);
  await ff.writeFile('list.txt', new TextEncoder().encode(lines.join('\n')));

  if (onProgress) {
    ff.on('progress', ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))));
  }

  const out = 'out.mp4';
  await ff.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'list.txt',
    '-vf', `fps=${fps},format=yuv420p`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', String(crf),
    '-movflags', '+faststart',
    '-an',
    // The repeated last entry would otherwise come out as one extra frame.
    '-frames:v', String(indices.length),
    out,
  ]);

  const data = await ff.readFile(out);

  // Cleanup MEMFS to free memory for next run.
  await Promise.allSettled([
    ...frames.map((_, i) => ff.deleteFile(`f${padIndex(i, pad)}.jpg`)),
    ff.deleteFile('list.txt'),
    ff.deleteFile(out),
  ]);

  return data as Uint8Array;
};

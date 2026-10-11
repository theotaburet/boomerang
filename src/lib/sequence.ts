/**
 * Pure helpers, no DOM, no React. Used by both the main thread and the workers.
 */
import type { Fit } from './presets';

/** Build a boomerang index sequence: [0,1,2,3,2,1] from N=4. */
export const boomerangIndices = (n: number): number[] => {
  if (n <= 1) return [0];
  const fwd = Array.from({ length: n }, (_, i) => i);
  const back = fwd.slice(1, -1).reverse();
  return [...fwd, ...back];
};

/**
 * Compute how many full boomerang cycles fit in `durationS` at `fps`.
 * Returns at least 1 cycle.
 */
export const cyclesForDuration = (uniqueFrames: number, fps: number, durationS: number): number => {
  const cycleLen = Math.max(1, boomerangIndices(uniqueFrames).length);
  const totalFrames = Math.max(1, Math.round(durationS * fps));
  return Math.max(1, Math.round(totalFrames / cycleLen));
};

/**
 * Expand boomerang indices repeated `cycles` times. Each cycle already stops one
 * short of frame 0, so cycles join (and the video loops) without a repeated frame.
 */
export const expandedSequence = (uniqueFrames: number, cycles: number): number[] =>
  Array.from({ length: Math.max(1, cycles) }, () => boomerangIndices(uniqueFrames)).flat();

/**
 * Rect in which to draw an image inside the canvas minus its padding.
 * 'contain' keeps the whole image; 'cover' scales it to fill `inner` and
 * overflows it, so the caller clips to `inner`.
 */
export const fitRect = (
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  paddingPct: number,
  fit: Fit
): { dx: number; dy: number; dw: number; dh: number; inner: { x: number; y: number; w: number; h: number } } => {
  const pad = Math.min(canvasW, canvasH) * (paddingPct / 100);
  const inner = { x: pad, y: pad, w: canvasW - 2 * pad, h: canvasH - 2 * pad };
  const scale = (fit === 'cover' ? Math.max : Math.min)(inner.w / imgW, inner.h / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { dx: (canvasW - dw) / 2, dy: (canvasH - dh) / 2, dw, dh, inner };
};

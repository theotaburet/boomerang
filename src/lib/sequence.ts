/**
 * Pure helpers — no DOM, no React. Used by both main thread and workers.
 */

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
 * Expand boomerang indices repeated `cycles` times.
 * Avoids producing two consecutive identical indices at junctions.
 */
export const expandedSequence = (uniqueFrames: number, cycles: number): number[] => {
  const base = boomerangIndices(uniqueFrames);
  if (cycles <= 1) return base;
  const out: number[] = [];
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < base.length; i++) {
      // Skip first index of subsequent cycles to avoid duplicate at junction.
      if (c > 0 && i === 0) continue;
      out.push(base[i]);
    }
  }
  return out;
};

/** Compute target rect (offsetX, offsetY, drawW, drawH) to "contain" image in canvas. */
export const containRect = (
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  paddingPct: number
): { dx: number; dy: number; dw: number; dh: number } => {
  const pad = Math.min(canvasW, canvasH) * (paddingPct / 100);
  const innerW = canvasW - 2 * pad;
  const innerH = canvasH - 2 * pad;
  const scale = Math.min(innerW / imgW, innerH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { dx: (canvasW - dw) / 2, dy: (canvasH - dh) / 2, dw, dh };
};

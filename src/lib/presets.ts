/**
 * Output presets define ASPECT + sane defaults. Resolution is chosen separately.
 */
export type PresetId = 'square' | 'portrait' | 'landscape';

export interface Preset {
  id: PresetId;
  label: string;
  aspectW: number;
  aspectH: number;
  fps: number;
  crf: number;
}

export const PRESETS: Record<PresetId, Preset> = {
  square:    { id: 'square',    label: 'Instagram Square',     aspectW: 1, aspectH: 1, fps: 30, crf: 22 },
  portrait:  { id: 'portrait',  label: 'Reels / Story / TikTok', aspectW: 9, aspectH: 16, fps: 30, crf: 22 },
  landscape: { id: 'landscape', label: 'Landscape 16:9',       aspectW: 16, aspectH: 9, fps: 30, crf: 22 },
};

export const PRESET_LIST = Object.values(PRESETS);

/** Available output sizes (long edge in px). */
export const SIZE_OPTIONS = [720, 1080, 1440, 2048, 4096] as const;
export type SizeOption = (typeof SIZE_OPTIONS)[number];

/**
 * Compute output dimensions, ensuring even values (H.264 requirement).
 * `longEdge` is applied to the longer side; the other side is derived from aspect.
 */
export const dimensionsFor = (p: Preset, longEdge: number): { width: number; height: number } => {
  const even = (n: number) => Math.round(n / 2) * 2;
  if (p.aspectW >= p.aspectH) {
    const width = even(longEdge);
    const height = even(longEdge * (p.aspectH / p.aspectW));
    return { width, height };
  }
  const height = even(longEdge);
  const width = even(longEdge * (p.aspectW / p.aspectH));
  return { width, height };
};

export const DEFAULT_PRESET: PresetId = 'square';
export const DEFAULT_SIZE: SizeOption = 1080;
export const DEFAULT_DURATION_S = 4;
export const DEFAULT_BG = '#FFFFFF';
export const DEFAULT_PADDING_PCT = 5;

export const FPS_MIN = 0.5;
export const FPS_MAX = 50;
export const FPS_STEP = 0.5;
export const DURATION_MIN = 1;
export const DURATION_MAX = 15;
export const PADDING_MIN = 0;
export const PADDING_MAX = 25;

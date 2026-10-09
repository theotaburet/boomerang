import exifr from 'exifr';
import { containRect } from './sequence';

export interface ProcessOptions {
  width: number;
  height: number;
  background: string;
  paddingPct: number;
}

const HEIC_EXT = /\.(heic|heif)$/i;
const HEIC_MIME = /^image\/(heic|heif)/i;

const isHeic = (file: File | Blob): boolean => {
  if (HEIC_MIME.test(file.type)) return true;
  if ('name' in file && typeof (file as File).name === 'string') {
    return HEIC_EXT.test((file as File).name);
  }
  return false;
};

/** Convert HEIC/HEIF to JPEG with heic2any, fetched from a CDN only when needed. */
const heicToJpeg = async (file: File | Blob): Promise<Blob> => {
  // The URL lives in a variable so TypeScript and Vite do not try to resolve it.
  const url = 'https://esm.sh/heic2any@0.0.4';
  const mod = (await import(/* @vite-ignore */ url)) as {
    default?: (opts: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;
  };
  const heic2any = mod.default!;
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
  return Array.isArray(out) ? out[0] : out;
};

/** Apply EXIF orientation 1-8 as a canvas transform. */
const applyOrientation = (
  ctx: OffscreenCanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number
): { drawW: number; drawH: number } => {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); return { drawW: h, drawH: w };
    case 6: ctx.transform(0, 1, -1, 0, h, 0); return { drawW: h, drawH: w };
    case 7: ctx.transform(0, -1, -1, 0, h, w); return { drawW: h, drawH: w };
    case 8: ctx.transform(0, -1, 1, 0, 0, w); return { drawW: h, drawH: w };
  }
  return { drawW: w, drawH: h };
};

/** Read EXIF orientation tag from a file (defaults to 1 on failure). */
export const readOrientation = async (file: File | Blob): Promise<number> => {
  try {
    const exif = await exifr.parse(file, { pick: ['Orientation'] });
    return (exif?.Orientation as number) ?? 1;
  } catch {
    return 1;
  }
};

/**
 * Decode, orient, pad, resize, return JPEG bytes.
 * Runs in a worker (OffscreenCanvas + createImageBitmap) and closes the source bitmap when done.
 */
export const processToJpeg = async (
  file: File | Blob,
  orientation: number,
  opts: ProcessOptions,
  quality = 0.9
): Promise<Uint8Array> => {
  const source: File | Blob = isHeic(file) ? await heicToJpeg(file) : file;
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  // 'from-image' applies EXIF orientation in current browsers; the manual
  // transform below is the fallback for older Safari.

  const { width, height, background, paddingPct } = opts;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const needsManual = orientation > 4; // rotated 90/270: swap dimensions
  const srcW = needsManual ? bitmap.height : bitmap.width;
  const srcH = needsManual ? bitmap.width : bitmap.height;

  const { dx, dy, dw, dh } = containRect(srcW, srcH, width, height, paddingPct);

  if (orientation > 1 && orientation <= 8) {
    ctx.save();
    // Translate to draw position then apply orientation in local space.
    ctx.translate(dx + dw / 2, dy + dh / 2);
    const local = applyOrientation(ctx, orientation, dw, dh);
    ctx.drawImage(bitmap, -local.drawW / 2, -local.drawH / 2, local.drawW, local.drawH);
    ctx.restore();
  } else {
    ctx.drawImage(bitmap, dx, dy, dw, dh);
  }

  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return new Uint8Array(await blob.arrayBuffer());
};

import { fitRect } from './sequence';
import type { Fit, Rotation } from './presets';

export interface ProcessOptions {
  width: number;
  height: number;
  background: string;
  paddingPct: number;
  fit: Fit;
  rotation: Rotation;
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

/**
 * Decode, fit, rotate, return JPEG bytes at the output size.
 * Runs in a worker (OffscreenCanvas + createImageBitmap) and closes the source bitmap when done.
 */
export const processToJpeg = async (
  file: File | Blob,
  opts: ProcessOptions,
  quality = 0.9
): Promise<Uint8Array> => {
  const source: File | Blob = isHeic(file) ? await heicToJpeg(file) : file;
  // 'from-image' applies the EXIF orientation, so the bitmap is already upright.
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });

  const { width, height, background, paddingPct, fit, rotation } = opts;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // A quarter turn swaps the footprint of the photo on the canvas.
  const quarterTurn = rotation % 180 !== 0;
  const srcW = quarterTurn ? bitmap.height : bitmap.width;
  const srcH = quarterTurn ? bitmap.width : bitmap.height;
  const { dx, dy, dw, dh, inner } = fitRect(srcW, srcH, width, height, paddingPct, fit);

  // 'cover' overflows the padded frame; the clip keeps the padding clean.
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  // Inside the rotated frame the axes follow the photo again.
  const drawW = quarterTurn ? dh : dw;
  const drawH = quarterTurn ? dw : dh;
  ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return new Uint8Array(await blob.arrayBuffer());
};

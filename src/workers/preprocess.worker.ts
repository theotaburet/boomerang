/// <reference lib="webworker" />
/**
 * Preprocess worker: decode + EXIF orient + pad to square + resize to JPEG bytes.
 * Receives one job at a time. Posts back the JPEG Uint8Array (transferable).
 */
import { processToJpeg, readOrientation, type ProcessOptions } from '~/lib/image';

export interface PreprocessRequest {
  id: number;
  file: File;
  opts: ProcessOptions;
}

export interface PreprocessResponse {
  id: number;
  bytes?: Uint8Array;
  error?: string;
}

self.onmessage = async (e: MessageEvent<PreprocessRequest>) => {
  const { id, file, opts } = e.data;
  try {
    const orientation = await readOrientation(file);
    const bytes = await processToJpeg(file, orientation, opts);
    const reply: PreprocessResponse = { id, bytes };
    (self as unknown as Worker).postMessage(reply, [bytes.buffer]);
  } catch (err) {
    const reply: PreprocessResponse = { id, error: (err as Error).message };
    (self as unknown as Worker).postMessage(reply);
  }
};

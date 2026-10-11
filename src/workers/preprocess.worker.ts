/// <reference lib="webworker" />
/**
 * Preprocess worker: decode, fit, rotate and resize one photo to JPEG bytes.
 * Receives one job at a time. Posts back the JPEG Uint8Array (transferable).
 */
import { processToJpeg, type ProcessOptions } from '~/lib/image';

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
    const bytes = await processToJpeg(file, opts);
    const reply: PreprocessResponse = { id, bytes };
    (self as unknown as Worker).postMessage(reply, [bytes.buffer]);
  } catch (err) {
    const reply: PreprocessResponse = { id, error: (err as Error).message };
    (self as unknown as Worker).postMessage(reply);
  }
};

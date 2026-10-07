/// <reference lib="webworker" />
/**
 * Encode worker: wraps ffmpeg.wasm encoder. Posts progress + final mp4 bytes.
 */
import { encodeBoomerang } from '~/lib/encoder';

export interface EncodeRequest {
  frames: Uint8Array[];
  fps: number;
  crf: number;
  durationS: number;
}

export type EncodeResponse =
  | { type: 'log'; message: string }
  | { type: 'progress'; ratio: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; error: string };

self.onmessage = async (e: MessageEvent<EncodeRequest>) => {
  const { frames, fps, crf, durationS } = e.data;
  const post = (msg: EncodeResponse, transfer: Transferable[] = []) =>
    (self as unknown as Worker).postMessage(msg, transfer);
  try {
    post({ type: 'log', message: `start: frames=${frames.length} fps=${fps} dur=${durationS}` });
    const bytes = await encodeBoomerang({
      frames,
      fps,
      crf,
      durationS,
      onProgress: (ratio) => post({ type: 'progress', ratio }),
      onLog: (message) => post({ type: 'log', message }),
    });
    post({ type: 'done', bytes }, [bytes.buffer]);
  } catch (err) {
    post({ type: 'error', error: (err as Error).message + '\n' + (err as Error).stack });
  }
};

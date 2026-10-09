/**
 * Worker orchestration. The only API the UI calls:
 *   const pipeline = createPipeline();
 *   const frames = await pipeline.preprocess(files, opts, onProgress);
 *   const blob   = await pipeline.encode({ frames, fps, crf, durationS }, onProgress);
 */
import type { ProcessOptions } from './image';
import type { PreprocessRequest, PreprocessResponse } from '~/workers/preprocess.worker';
import type { EncodeRequest, EncodeResponse } from '~/workers/encode.worker';

const MAX_PARALLEL = Math.max(2, Math.min(4, navigator.hardwareConcurrency || 2));

const spawnPreprocess = () =>
  new Worker(new URL('~/workers/preprocess.worker.ts', import.meta.url), { type: 'module' });

const spawnEncode = () =>
  new Worker(new URL('~/workers/encode.worker.ts', import.meta.url), { type: 'module' });

export interface Pipeline {
  preprocess: (
    files: File[],
    opts: ProcessOptions,
    onProgress?: (done: number, total: number) => void
  ) => Promise<Uint8Array[]>;
  encode: (
    args: EncodeRequest,
    onProgress?: (ratio: number) => void
  ) => Promise<Blob>;
  dispose: () => void;
}

export const createPipeline = (): Pipeline => {
  const pool: Worker[] = Array.from({ length: MAX_PARALLEL }, spawnPreprocess);
  let encoder: Worker | null = null;

  const preprocess: Pipeline['preprocess'] = async (files, opts, onProgress) => {
    const out = new Array<Uint8Array>(files.length);
    let nextIdx = 0;
    let done = 0;

    const runOn = (worker: Worker): Promise<void> =>
      new Promise((resolve, reject) => {
        const tick = () => {
          const i = nextIdx++;
          if (i >= files.length) return resolve();
          const handler = (e: MessageEvent<PreprocessResponse>) => {
            if (e.data.id !== i) return;
            worker.removeEventListener('message', handler);
            if (e.data.error || !e.data.bytes) {
              return reject(new Error(e.data.error || 'preprocess failed'));
            }
            out[i] = e.data.bytes;
            done++;
            onProgress?.(done, files.length);
            tick();
          };
          worker.addEventListener('message', handler);
          const req: PreprocessRequest = { id: i, file: files[i], opts };
          worker.postMessage(req);
        };
        tick();
      });

    await Promise.all(pool.map(runOn));
    return out;
  };

  const encode: Pipeline['encode'] = (req, onProgress) =>
    new Promise((resolve, reject) => {
      encoder?.terminate();
      encoder = spawnEncode();
      encoder.onmessage = (e: MessageEvent<EncodeResponse>) => {
        const msg = e.data;
        if (msg.type === 'progress') onProgress?.(msg.ratio);
        else if (msg.type === 'log') {
          // ffmpeg and worker logs, visible in the devtools console.
          console.log('[encode]', msg.message);
        }
        else if (msg.type === 'done') {
          resolve(new Blob([msg.bytes as BlobPart], { type: 'video/mp4' }));
          encoder?.terminate();
          encoder = null;
        } else if (msg.type === 'error') {
          reject(new Error(msg.error));
          encoder?.terminate();
          encoder = null;
        }
      };
      // Copy the buffers (small JPEGs), do not transfer them: the main thread
      // keeps the frames for the live preview and for a re-encode.
      encoder.postMessage(req);
    });

  const dispose = () => {
    pool.forEach((w) => w.terminate());
    encoder?.terminate();
    encoder = null;
  };

  return { preprocess, encode, dispose };
};

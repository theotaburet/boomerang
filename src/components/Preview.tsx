import { useEffect, useMemo, useRef, useState } from 'react';
import { boomerangIndices } from '~/lib/sequence';

interface Props {
  frames: Uint8Array[];
  fps: number;
  width: number;
  height: number;
  videoUrl: string | null;
  placeholder?: boolean;
  /** Show a busy overlay (preprocessing / encoding) on top of the canvas. */
  busy?: boolean;
  busyLabel?: string;
  busyRatio?: number;
}

/**
 * Live preview using boomerang sequence on canvas (instant, no encode needed).
 * Switches to <video> player once exported.
 */
export default function Preview({
  frames, fps, width, height, videoUrl, placeholder, busy, busyLabel, busyRatio,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmaps, setBitmaps] = useState<ImageBitmap[] | null>(null);
  const [playing, setPlaying] = useState(true);
  const indices = useMemo(() => boomerangIndices(frames.length), [frames.length]);

  // Decode preview bitmaps once.
  useEffect(() => {
    let cancelled = false;
    let local: ImageBitmap[] = [];
    (async () => {
      const out = await Promise.all(
        frames.map((bytes) => createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/jpeg' })))
      );
      if (cancelled) { out.forEach((b) => b.close()); return; }
      local = out;
      setBitmaps(out);
    })();
    return () => { cancelled = true; local.forEach((b) => b.close()); setBitmaps(null); };
  }, [frames]);

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmaps?.length || !playing) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let raf = 0;
    const interval = 1000 / fps;
    let last = 0;
    let pos = 0;

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (ts - last < interval) return;
      last = ts;
      const idx = indices[pos % indices.length];
      const bmp = bitmaps[idx];
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      pos++;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bitmaps, indices, fps, playing]);

  return (
    <div className="brut p-4 md:p-6" data-testid="preview">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black uppercase">Preview</h2>
        {!videoUrl && !placeholder && frames.length > 0 && (
          <button onClick={() => setPlaying((p) => !p)} className="brut-btn text-sm">
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
      </div>
      <div
        className="relative mx-auto border-4 border-black bg-black shadow-[6px_6px_0_0_#000]"
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: 540 }}
      >
        {placeholder ? (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-brut-bg)] text-center text-xs font-mono uppercase font-bold text-black/60 p-4">
            Drop photos to see preview
          </div>
        ) : videoUrl ? (
          <video
            src={videoUrl}
            className="h-full w-full"
            controls
            autoPlay
            loop
            playsInline
            data-testid="preview-video"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="h-full w-full"
            data-testid="preview-canvas"
          />
        )}

        {busy && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white p-4"
            data-testid="preview-busy"
            role="status"
            aria-live="polite"
          >
            <div className="text-xs font-mono uppercase font-black tracking-wider text-center">
              {busyLabel || 'Working…'}
            </div>
            <div className="w-3/4 max-w-[260px] h-3 border-2 border-white bg-black/40">
              <div
                className="h-full transition-[width] duration-150"
                style={{
                  width: `${Math.round(Math.max(0, Math.min(1, busyRatio ?? 0)) * 100)}%`,
                  background: 'var(--color-brut-accent)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

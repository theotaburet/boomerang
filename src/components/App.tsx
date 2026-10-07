import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createPipeline, type Pipeline } from '~/lib/pipeline';
import {
  DEFAULT_BG, DEFAULT_DURATION_S, DEFAULT_PADDING_PCT, DEFAULT_PRESET, DEFAULT_SIZE,
  PRESETS, dimensionsFor, type PresetId, type SizeOption,
} from '~/lib/presets';
import Dropzone from './Dropzone';
import Settings from './Settings';
import Preview from './Preview';
import ExportButton from './ExportButton';
import ProgressBar from './ProgressBar';

type Phase = 'idle' | 'preprocessing' | 'ready' | 'encoding' | 'done' | 'error';

interface State {
  files: File[];
  presetId: PresetId;
  size: SizeOption;
  fps: number;
  durationS: number;
  background: string;
  paddingPct: number;
  phase: Phase;
  progress: number;
  progressLabel: string;
  frames: Uint8Array[];
  videoUrl: string | null;
  error: string | null;
}

type Action =
  | { type: 'set-files'; files: File[] }
  | { type: 'set-preset'; id: PresetId }
  | { type: 'set-size'; size: SizeOption }
  | { type: 'set-fps'; fps: number }
  | { type: 'set-duration'; s: number }
  | { type: 'set-bg'; color: string }
  | { type: 'set-padding'; pct: number }
  | { type: 'phase'; phase: Phase }
  | { type: 'progress'; ratio: number; label?: string }
  | { type: 'frames-ready'; frames: Uint8Array[] }
  | { type: 'video-ready'; url: string }
  | { type: 'error'; msg: string };

const stale = (s: State): State => ({
  ...s,
  frames: [],
  videoUrl: null,
  // If files are loaded, we'll need to re-preprocess → enter that phase right away.
  phase: s.files.length ? 'preprocessing' : 'idle',
  progressLabel: s.files.length ? 'Loading photos…' : '',
  error: null,
  progress: 0,
});

const initial: State = {
  files: [],
  presetId: DEFAULT_PRESET,
  size: DEFAULT_SIZE,
  fps: PRESETS[DEFAULT_PRESET].fps,
  durationS: DEFAULT_DURATION_S,
  background: DEFAULT_BG,
  paddingPct: DEFAULT_PADDING_PCT,
  phase: 'idle',
  progress: 0,
  progressLabel: '',
  frames: [],
  videoUrl: null,
  error: null,
};

const reducer = (s: State, a: Action): State => {
  switch (a.type) {
    case 'set-files':    return stale({ ...s, files: a.files });
    case 'set-preset':   return stale({ ...s, presetId: a.id, fps: PRESETS[a.id].fps });
    case 'set-size':     return stale({ ...s, size: a.size });
    case 'set-bg':       return stale({ ...s, background: a.color });
    case 'set-padding':  return stale({ ...s, paddingPct: a.pct });
    case 'set-fps':      return { ...s, fps: a.fps, videoUrl: null, phase: s.frames.length ? 'ready' : s.phase };
    case 'set-duration': return { ...s, durationS: a.s, videoUrl: null, phase: s.frames.length ? 'ready' : s.phase };
    case 'phase':        return { ...s, phase: a.phase, error: null };
    case 'progress':     return { ...s, progress: a.ratio, progressLabel: a.label ?? s.progressLabel };
    case 'frames-ready': return { ...s, frames: a.frames, phase: 'ready', progress: 1 };
    case 'video-ready':  return { ...s, videoUrl: a.url, phase: 'done', progress: 1 };
    case 'error':        return { ...s, error: a.msg, phase: 'error' };
  }
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const pipelineRef = useRef<Pipeline | null>(null);

  const getPipeline = useCallback(() => {
    if (!pipelineRef.current) pipelineRef.current = createPipeline();
    return pipelineRef.current;
  }, []);

  useEffect(() => () => pipelineRef.current?.dispose(), []);

  useEffect(() => {
    const url = state.videoUrl;
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [state.videoUrl]);

  const preset = PRESETS[state.presetId];
  const { width, height } = useMemo(() => dimensionsFor(preset, state.size), [preset, state.size]);

  const runPreprocess = useCallback(async () => {
    if (!state.files.length) return;
    dispatch({ type: 'phase', phase: 'preprocessing' });
    dispatch({ type: 'progress', ratio: 0, label: 'Processing images…' });
    try {
      const frames = await getPipeline().preprocess(
        state.files,
        { width, height, background: state.background, paddingPct: state.paddingPct },
        (done, total) => dispatch({ type: 'progress', ratio: done / total, label: `Processing ${done}/${total}` })
      );
      dispatch({ type: 'frames-ready', frames });
    } catch (err) {
      dispatch({ type: 'error', msg: (err as Error).message });
    }
  }, [state.files, state.background, state.paddingPct, width, height, getPipeline]);

  const runExport = useCallback(async () => {
    if (!state.frames.length) return;
    dispatch({ type: 'phase', phase: 'encoding' });
    dispatch({ type: 'progress', ratio: 0, label: 'Loading encoder…' });
    try {
      const blob = await getPipeline().encode(
        {
          frames: state.frames,
          fps: state.fps,
          crf: preset.crf,
          durationS: state.durationS,
        },
        (ratio) => dispatch({ type: 'progress', ratio, label: `Encoding ${Math.round(ratio * 100)}%` })
      );
      dispatch({ type: 'video-ready', url: URL.createObjectURL(blob) });
    } catch (err) {
      dispatch({ type: 'error', msg: (err as Error).message });
    }
  }, [state.frames, preset, state.fps, state.durationS, width, height, getPipeline]);

  useEffect(() => {
    if (state.phase === 'preprocessing' && state.files.length && !state.frames.length && state.progress === 0) {
      void runPreprocess();
    }
  }, [state.phase, state.files, state.frames.length, state.progress, runPreprocess]);

  const busy = state.phase === 'preprocessing' || state.phase === 'encoding';
  const hasFiles = state.files.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <header className="mb-6 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
            Boomerang
          </h1>
          <p className="mt-2 text-sm md:text-base font-bold opacity-80">
            Photos → looped video. 100% in your browser.
          </p>
        </div>
        <div className="brut-sm px-3 py-2 text-xs font-mono uppercase font-bold inline-block">
          No upload · No server · No tracking
        </div>
      </header>

      <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="flex flex-col gap-6" data-testid="left-col">
          <Dropzone
            files={state.files}
            onFiles={(files) => dispatch({ type: 'set-files', files })}
            disabled={busy}
          />

          {hasFiles && (
            <Settings
              presetId={state.presetId}
              size={state.size}
              fps={state.fps}
              durationS={state.durationS}
              background={state.background}
              paddingPct={state.paddingPct}
              width={width}
              height={height}
              disabled={busy}
              onPreset={(id) => dispatch({ type: 'set-preset', id })}
              onSize={(s) => dispatch({ type: 'set-size', size: s })}
              onFps={(fps) => dispatch({ type: 'set-fps', fps })}
              onDuration={(s) => dispatch({ type: 'set-duration', s })}
              onBg={(c) => dispatch({ type: 'set-bg', color: c })}
              onPadding={(p) => dispatch({ type: 'set-padding', pct: p })}
            />
          )}
        </section>

        <section className="flex flex-col gap-6" data-testid="right-col">
          <Preview
            frames={state.frames}
            fps={state.fps}
            width={width}
            height={height}
            videoUrl={state.videoUrl}
            placeholder={!hasFiles}
            busy={busy}
            busyLabel={state.progressLabel}
            busyRatio={state.progress}
          />

          {(busy || (state.progress > 0 && state.progress < 1)) && (
            <ProgressBar ratio={state.progress} label={state.progressLabel || 'Working…'} />
          )}

          {hasFiles && (
            <ExportButton
              disabled={!state.frames.length || busy}
              phase={state.phase}
              videoUrl={state.videoUrl}
              onExport={runExport}
              filename={`boomerang-${preset.id}-${width}x${height}-${state.fps}fps-${Date.now()}.mp4`}
            />
          )}

          {state.error && (
            <div
              className="brut p-4 text-white"
              style={{ background: 'var(--color-brut-danger)' }}
              role="alert"
              data-testid="error-banner"
            >
              <strong className="uppercase">Error:</strong> {state.error}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 border-t-4 border-black pt-4 text-xs font-bold opacity-70">
        Built with Astro · React · ffmpeg.wasm.
      </footer>
    </div>
  );
}

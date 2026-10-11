import {
  PRESET_LIST,
  type PresetId,
  SIZE_OPTIONS,
  type SizeOption,
  FPS_MIN, FPS_MAX, FPS_STEP,
  DURATION_MIN, DURATION_MAX,
  PADDING_MIN, PADDING_MAX,
  ROTATIONS, type Fit, type Rotation,
} from '~/lib/presets';

interface Props {
  presetId: PresetId;
  size: SizeOption;
  fps: number;
  durationS: number;
  background: string;
  paddingPct: number;
  fit: Fit;
  rotation: Rotation;
  width: number;
  height: number;
  disabled?: boolean;
  onPreset: (id: PresetId) => void;
  onSize: (s: SizeOption) => void;
  onFps: (fps: number) => void;
  onDuration: (s: number) => void;
  onBg: (color: string) => void;
  onPadding: (pct: number) => void;
  onFit: (fit: Fit) => void;
  onRotation: (deg: Rotation) => void;
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-2">
    <span className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-black uppercase tracking-wider">{label}</span>
      {hint && <span className="text-xs font-mono opacity-70" data-testid={`hint-${label.toLowerCase()}`}>{hint}</span>}
    </span>
    {children}
  </label>
);

const Slider = ({
  value, min, max, step = 1, onChange, disabled, testid,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (n: number) => void; disabled?: boolean; testid: string;
}) => (
  <input
    type="range"
    min={min} max={max} step={step}
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(Number(e.target.value))}
    className="w-full accent-black"
    data-testid={testid}
  />
);

const Choice = ({
  checked, onClick, testid, children,
}: {
  checked: boolean; onClick: () => void; testid: string; children: React.ReactNode;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={checked}
    onClick={onClick}
    data-testid={testid}
    className={`brut-btn text-xs px-2 py-2 ${checked ? 'bg-[var(--color-brut-accent-3)] text-white' : ''}`}
  >
    {children}
  </button>
);

const FITS: { id: Fit; label: string; hint: string }[] = [
  { id: 'contain', label: 'Fit', hint: 'whole photo' },
  { id: 'cover', label: 'Fill', hint: 'crop to frame' },
];

export default function Settings({
  presetId, size, fps, durationS, background, paddingPct, fit, rotation, width, height, disabled,
  onPreset, onSize, onFps, onDuration, onBg, onPadding, onFit, onRotation,
}: Props) {
  const totalFrames = Math.round(durationS * fps);
  const isHeavy = size >= 2048;

  return (
    <fieldset
      disabled={disabled}
      className="brut p-5 grid gap-5"
      data-testid="settings"
    >
      <legend className="brut-sm bg-[var(--color-brut-accent)] px-3 py-1 text-sm font-black uppercase text-white">
        Settings
      </legend>

      <Field label="Format">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Format">
          {PRESET_LIST.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={presetId === p.id}
              onClick={() => onPreset(p.id)}
              data-testid={`preset-${p.id}`}
              className={`brut-btn text-left text-xs leading-tight ${
                presetId === p.id ? 'bg-[var(--color-brut-accent)] text-white' : ''
              }`}
            >
              <div className="font-black">{p.label}</div>
              <div className="text-[10px] opacity-70 normal-case font-normal mt-1">
                {p.aspectW}:{p.aspectH}
              </div>
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Size"
        hint={`${width}×${height}${isHeavy ? ' · slow on mobile' : ''}`}
      >
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Size">
          {SIZE_OPTIONS.map((s) => (
            <Choice key={s} checked={size === s} onClick={() => onSize(s)} testid={`size-${s}`}>
              {s % 1024 ? s : `${s / 1024}K`}
              <div className="text-[9px] opacity-70 normal-case font-normal">{s}px</div>
            </Choice>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="FPS" hint={`${fps}`}>
          <Slider
            value={fps} min={FPS_MIN} max={FPS_MAX} step={FPS_STEP}
            onChange={onFps} testid="fps-slider"
          />
        </Field>

        <Field label="Duration" hint={`${durationS}s · ${totalFrames}f`}>
          <Slider
            value={durationS} min={DURATION_MIN} max={DURATION_MAX}
            onChange={onDuration} testid="duration-slider"
          />
        </Field>

        <Field label="Padding" hint={`${paddingPct}%`}>
          <Slider
            value={paddingPct} min={PADDING_MIN} max={PADDING_MAX}
            onChange={onPadding} testid="padding-slider"
          />
        </Field>

        <Field label="Background" hint={background.toUpperCase()}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={background}
              onChange={(e) => onBg(e.target.value)}
              className="brut-input h-10 w-14 cursor-pointer p-1"
              aria-label="Background color"
              data-testid="bg-color"
            />
            <input
              type="text"
              value={background}
              onChange={(e) => onBg(e.target.value)}
              className="brut-input flex-1 uppercase text-sm"
              maxLength={7}
              data-testid="bg-text"
            />
          </div>
        </Field>

        <Field label="Fit">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Fit">
            {FITS.map((f) => (
              <Choice key={f.id} checked={fit === f.id} onClick={() => onFit(f.id)} testid={`fit-${f.id}`}>
                {f.label}
                <div className="text-[9px] opacity-70 normal-case font-normal">{f.hint}</div>
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="Rotation">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Rotation">
            {ROTATIONS.map((deg) => (
              <Choice key={deg} checked={rotation === deg} onClick={() => onRotation(deg)} testid={`rotation-${deg}`}>
                {deg}°
              </Choice>
            ))}
          </div>
        </Field>
      </div>
    </fieldset>
  );
}

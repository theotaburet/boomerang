interface Props {
  ratio: number;
  label: string;
}

export default function ProgressBar({ ratio, label }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className="brut-sm mt-6 p-3">
      <div className="mb-1 flex justify-between text-xs font-black uppercase">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-4 border-2 border-black bg-white">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: 'var(--color-brut-accent)' }}
        />
      </div>
    </div>
  );
}

interface Props {
  disabled: boolean;
  phase: string;
  videoUrl: string | null;
  filename: string;
  onExport: () => void;
}

export default function ExportButton({ disabled, phase, videoUrl, filename, onExport }: Props) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onExport}
        className="brut-btn text-lg"
        style={{ background: 'var(--color-brut-accent-3)', color: 'white' }}
        data-testid="export-button"
      >
        {phase === 'encoding' ? 'Encoding…' : videoUrl ? 'Re-encode' : 'Export MP4'}
      </button>

      {videoUrl && (
        <a
          href={videoUrl}
          download={filename}
          className="brut-btn text-lg"
          style={{ background: 'var(--color-brut-accent-2)' }}
          data-testid="download-link"
        >
          ↓ Download
        </a>
      )}
    </div>
  );
}

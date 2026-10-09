import { useCallback, useRef, useState } from 'react';

interface Props {
  files: File[];
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);

/** Natural alphanumeric sort so IMG_2, IMG_10 order correctly. */
const naturalSort = (a: File, b: File) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

export default function Dropzone({ files, onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter(isImage).sort(naturalSort);
    onFiles(arr);
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`brut cursor-pointer p-8 md:p-12 text-center transition-colors ${
        over ? 'bg-[var(--color-brut-accent-2)]' : 'bg-white'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      role="button"
      tabIndex={0}
      data-testid="dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handle(e.target.files)}
        data-testid="file-input"
      />
      <div className="text-2xl md:text-3xl font-black uppercase">
        {files.length === 0 ? 'Drop your photos here' : `${files.length} photo${files.length > 1 ? 's' : ''} selected`}
      </div>
      <div className="mt-2 text-sm font-bold opacity-70">
        {files.length === 0 ? 'or click. JPG, PNG, WebP, HEIC' : 'click to replace'}
      </div>
    </div>
  );
}

import { useRef, useState, type ReactNode } from 'react';

export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv';

export function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name);
}

/** Área que aceita arrastar ou clicar para escolher um arquivo de vídeo. */
export function DropZone({ onFile, children, className = '', accept = VIDEO_ACCEPT, label }: { onFile: (f: File) => void; children: ReactNode; className?: string; accept?: string; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      data-active={over}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`dashed-drop cursor-pointer transition-colors ${over ? 'bg-spot/[0.05]' : 'hover:bg-raised/40'} ${className}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {children}
    </div>
  );
}

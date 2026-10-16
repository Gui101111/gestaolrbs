"use client";

import * as React from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

export type VideoPlayerHandle = { currentTime: () => number; pause: () => void; seek: (t: number) => void };

/** Player com controles próprios no visual da marca. */
export const VideoPlayer = React.forwardRef<
  VideoPlayerHandle,
  { src: string | null; poster?: string | null; className?: string; aspect?: string; label?: string; onTime?: (t: number) => void }
>(({ src, poster, className, aspect = "16:9", label, onTime }, ref) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [error, setError] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    currentTime: () => videoRef.current?.currentTime ?? 0,
    pause: () => videoRef.current?.pause(),
    seek: (t: number) => {
      if (videoRef.current) videoRef.current.currentTime = t;
    },
  }));

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const [w, h] = aspect.split(":").map(Number);

  return (
    <div
      ref={wrapRef}
      className={cn("group relative overflow-hidden rounded-2xl border border-fg/10 bg-black", className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {src && !error ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            onTime?.(e.currentTarget.currentTime);
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onError={() => setError(true)}
          onClick={toggle}
          aria-label={label}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-mist">
          {error ? "Não foi possível carregar o vídeo. Atualize a página para gerar um novo link seguro." : "Vídeo indisponível."}
        </div>
      )}

      {src && !error && (
        <>
          {!playing && (
            <button
              type="button"
              onClick={toggle}
              className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold/90 text-on-gold shadow-[0_0_40px_rgba(198,161,91,0.6)] transition-transform hover:scale-105"
              aria-label="Reproduzir"
            >
              <Play className="ml-0.5 size-6 fill-current" />
            </button>
          )}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pt-8 pb-2.5 transition-opacity duration-300",
              playing ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : "opacity-100",
            )}
          >
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={time}
              onChange={(e) => {
                const v = videoRef.current;
                if (v) v.currentTime = Number(e.target.value);
              }}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-fg/20 accent-[#C6A15B]"
              aria-label="Posição do vídeo"
            />
            <div className="mt-1.5 flex items-center gap-2 text-xs text-ivory/85">
              <button type="button" onClick={toggle} className="grid size-8 place-items-center rounded-full hover:bg-fg/10" aria-label={playing ? "Pausar" : "Reproduzir"}>
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }}
                className="grid size-8 place-items-center rounded-full hover:bg-fg/10"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <span className="font-mono tabular-nums">
                {formatDuration(time)} / {formatDuration(duration)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = wrapRef.current;
                  if (!el) return;
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else void el.requestFullscreen?.();
                }}
                className="ml-auto grid size-8 place-items-center rounded-full hover:bg-fg/10"
                aria-label="Tela cheia"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
VideoPlayer.displayName = "VideoPlayer";

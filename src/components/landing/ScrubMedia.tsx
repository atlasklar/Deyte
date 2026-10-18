"use client";

import type { MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/util";

type Frames = { count: number; path: (i: number) => string };

/**
 * Plays a clip by scroll position. With extracted frames it draws them to a
 * canvas (buttery on phones); otherwise it seeks a muted video. Either way the
 * playhead eases toward the scroll target, so fast flicks still look smooth.
 */
export function ScrubMedia({
  progress,
  video,
  poster,
  seq,
  className,
}: {
  progress: MotionValue<number>;
  video: string;
  poster?: string;
  /** Folder with manifest.json + frames, written by scripts/fetch-media.sh. */
  seq?: string;
  className?: string;
}) {
  const [frames, setFrames] = useState<Frames | null>(null);
  useEffect(() => {
    if (!seq) return;
    let cancelled = false;
    fetch(`${seq}/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { count: number; ext: string } | null) => {
        if (!cancelled && m?.count) setFrames({ count: m.count, path: (i) => `${seq}/${String(i + 1).padStart(4, "0")}.${m.ext}` });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seq]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let current = progress.get();
    let alive = true;

    if (frames) {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const images: HTMLImageElement[] = [];
      // First frame immediately, then the rest in the background.
      for (let i = 0; i < frames.count; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = frames.path(i);
        images.push(img);
      }
      let drawn = -1;
      const draw = () => {
        if (!alive) return;
        current += (progress.get() - current) * 0.18;
        const want = Math.round(current * (frames.count - 1));
        // Nearest loaded frame so scrubbing never shows a blank.
        let i = want;
        while (i > 0 && !images[i]?.complete) i--;
        const img = images[i];
        if (i !== drawn && img?.complete && img.naturalWidth) {
          if (canvas.width !== img.naturalWidth) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
          }
          ctx.drawImage(img, 0, 0);
          drawn = i;
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      return () => {
        alive = false;
        cancelAnimationFrame(raf);
      };
    }

    const v = videoRef.current!;
    v.pause();
    // iOS only buffers a video after a gesture; prime it on the first touch.
    const prime = () => {
      v.play()
        .then(() => v.pause())
        .catch(() => {});
    };
    window.addEventListener("touchstart", prime, { once: true, passive: true });

    const step = () => {
      if (!alive) return;
      current += (progress.get() - current) * 0.12;
      const d = v.duration;
      if (d && !v.seeking) {
        const t = Math.min(d - 0.05, Math.max(0, current * d));
        if (Math.abs(v.currentTime - t) > 1 / 60) v.currentTime = t;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("touchstart", prime);
    };
  }, [progress, frames]);

  return frames ? (
    <canvas ref={canvasRef} className={cn("h-full w-full object-contain", className)} aria-hidden />
  ) : (
    <video ref={videoRef} src={video} poster={poster} muted playsInline preload="auto" className={cn("h-full w-full object-contain", className)} aria-hidden />
  );
}

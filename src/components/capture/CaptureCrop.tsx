import { useEffect, useRef, useState } from 'react';
import { useInView } from '~/components/globe/useGlobe';
import type { Site } from '~/content/sites';
import { getCapture } from './client';

/**
 * A crop of a site's latest capture, centred on its focus point. Drawn when
 * it nears the screen; the box keeps its size so nothing shifts.
 */
export function CaptureCrop({
  site,
  falseColor = false,
  zoom = 1.6,
  label,
  className = ''
}: {
  site: Site;
  falseColor?: boolean;
  /** How much closer than the full scene, 1 = whole scene. */
  zoom?: number;
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const near = useInView(box, '500px');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    getCapture(site, 'after', 1536).then((imgs) => {
      if (cancelled || !canvas.current || !box.current) return;
      const src = falseColor ? imgs.falseColor : imgs.trueColor;
      const sw = (src as { width: number }).width;
      const sh = (src as { height: number }).height;
      const rect = box.current.getBoundingClientRect();
      const aspect = rect.width / rect.height || 1;
      const cw = Math.min(sw, sw / zoom);
      const ch = Math.min(sh, cw / aspect);
      const cwFit = ch * aspect;
      const cx = Math.max(0, Math.min(sw - cwFit, site.focus[0] * sw - cwFit / 2));
      const cy = Math.max(0, Math.min(sh - ch, site.focus[1] * sh - ch / 2));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = canvas.current;
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
      c.getContext('2d')?.drawImage(src, cx, cy, cwFit, ch, 0, 0, c.width, c.height);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [near, site, falseColor, zoom]);

  return (
    <div ref={box} className={`relative overflow-hidden bg-surface ${className}`}>
      <canvas
        ref={canvas}
        role='img'
        aria-label={label}
        className='absolute inset-0 h-full w-full transition-opacity duration-700'
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from '~/components/globe/useGlobe';
import { tasking } from '~/content/home';
import type { Site } from '~/content/sites';
import type { CaptureImages } from './client';
import { getCapture } from './client';

export type CaptureMeta = { label: string; value: string }[];

/** Picks a round scale-bar length for a scene width. */
function scaleBar(sceneWidthKm: number) {
  const target = sceneWidthKm * 0.18;
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2];
  const km = steps.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best), steps[0]);
  return { pct: (km / sceneWidthKm) * 100, label: km < 1 ? `${km * 1000} m` : `${km} km` };
}

function draw(canvas: HTMLCanvasElement | null, img: CanvasImageSource | undefined) {
  if (!canvas || !img) return;
  const w = (img as { width: number }).width;
  const h = (img as { height: number }).height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, 0, 0);
}

/**
 * A generated capture with a before/after divider and a false-color toggle.
 * Images are rendered in a worker the first time the viewer nears the screen.
 */
export function CaptureViewer({
  site,
  resolution = 1536,
  meta,
  defaultFalseColor = false,
  reveal = false,
  headingId,
  className = ''
}: {
  site: Site;
  resolution?: number;
  meta?: CaptureMeta;
  defaultFalseColor?: boolean;
  /** Sweep the divider in once, to show what changed. */
  reveal?: boolean;
  headingId?: string;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const beforeCanvas = useRef<HTMLCanvasElement>(null);
  const afterCanvas = useRef<HTMLCanvasElement>(null);
  const near = useInView(frame, '600px');
  const reduced = useReducedMotion();
  const [falseColor, setFalseColor] = useState(defaultFalseColor);
  const [pos, setPos] = useState(reveal ? 96 : 50);
  const [images, setImages] = useState<{ before: CaptureImages; after: CaptureImages } | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!near || started.current) return;
    started.current = true;
    let cancelled = false;
    Promise.all([getCapture(site, 'after', resolution), getCapture(site, 'before', resolution)])
      .then(([after, before]) => !cancelled && setImages({ before, after }))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      started.current = false;
    };
  }, [near, site, resolution]);

  useEffect(() => {
    if (!images) return;
    draw(beforeCanvas.current, falseColor ? images.before.falseColor : images.before.trueColor);
    draw(afterCanvas.current, falseColor ? images.after.falseColor : images.after.trueColor);
  }, [images, falseColor]);

  // Once loaded, sweep the divider from the right edge to the middle.
  useEffect(() => {
    if (!images || !reveal) return;
    // With reduced motion the divider lands in the middle on the first frame.
    const duration = reduced ? 0 : 1100;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - t0) / duration) : 1;
      const e = 1 - Math.pow(1 - t, 3);
      setPos(96 - 46 * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [images, reveal, reduced]);

  const bar = scaleBar(site.sceneWidthKm);
  const ready = Boolean(images);

  return (
    <figure className={className} aria-labelledby={headingId}>
      <div
        ref={frame}
        className='group @container relative aspect-[3/2] w-full overflow-hidden bg-surface'
        data-capture={site.id}
      >
        <canvas
          ref={beforeCanvas}
          className='absolute inset-0 h-full w-full transition-opacity duration-500'
          style={{ opacity: ready ? 1 : 0 }}
          role='img'
          aria-label={`${site.name}, ${site.before}`}
        />
        <canvas
          ref={afterCanvas}
          className='absolute inset-0 h-full w-full transition-opacity duration-500'
          style={{ opacity: ready ? 1 : 0, clipPath: `inset(0 0 0 ${pos}%)` }}
          role='img'
          aria-label={`${site.name}, ${site.after}`}
        />

        {!ready ? (
          <div className='absolute inset-0 grid place-items-center'>
            <p className='label'>{failed ? 'Capture unavailable' : 'Rendering capture…'}</p>
          </div>
        ) : null}

        {/* Divider and handle. */}
        <div
          className='pointer-events-none absolute inset-y-0 w-px bg-ink/90'
          style={{ left: `${pos}%` }}
          aria-hidden='true'
        >
          <div className='absolute left-1/2 top-1/2 flex h-11 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-ink bg-bg/70 group-has-[input:focus-visible]:outline-2 group-has-[input:focus-visible]:outline-offset-2 group-has-[input:focus-visible]:outline-ink'>
            <svg width='14' height='10' viewBox='0 0 14 10' aria-hidden='true'>
              <path d='M4 1 L1 5 L4 9 M10 1 L13 5 L10 9' fill='none' stroke='currentColor' strokeWidth='1.2' />
            </svg>
          </div>
        </div>
        <input
          type='range'
          min={0}
          max={100}
          step={0.5}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`${tasking.viewer.sliderLabel}: ${site.before} on the left, ${site.after} on the right`}
          aria-valuetext={`${Math.round(pos)}% ${site.before}`}
          className='absolute inset-0 h-full w-full cursor-ew-resize opacity-0'
        />

        {/* HUD overlay. */}
        <div className='pointer-events-none absolute inset-0' aria-hidden='true'>
          <div className='brackets absolute inset-3' style={{ '--b': 'rgba(238,242,247,0.7)' } as React.CSSProperties} />
          <p className='label absolute left-5 top-5 bg-bg/70 px-2 py-1 text-ink'>
            Before<span className='@max-md:hidden'> · {site.before}</span>
          </p>
          <p className='label absolute right-5 top-5 bg-bg/70 px-2 py-1 text-ink'>
            After<span className='@max-md:hidden'> · {site.after}</span>
          </p>
          <div className='absolute bottom-5 left-5 bg-bg/70 px-2 py-1.5'>
            <p className='label mb-1 text-ink'>{bar.label}</p>
            <div className='h-1 border-x border-b border-ink' style={{ width: `${bar.pct}cqw` }} />
          </div>
          <div className='absolute bottom-5 right-5 flex items-center gap-2 bg-bg/70 px-2 py-1'>
            <svg width='10' height='12' viewBox='0 0 10 12' aria-hidden='true' className='text-ink'>
              <path d='M5 0 L9 11 L5 8 L1 11 Z' fill='currentColor' />
            </svg>
            <span className='label text-ink'>N</span>
          </div>
        </div>
      </div>

      <figcaption className='mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3'>
        <div className='flex border border-line' role='group' aria-label='Bands'>
          <button
            type='button'
            className={`label min-h-11 whitespace-nowrap px-4 ${!falseColor ? 'bg-ink text-bg' : 'text-ink hover:bg-raised'}`}
            aria-pressed={!falseColor}
            onClick={() => setFalseColor(false)}
          >
            {tasking.viewer.trueColor}
          </button>
          <button
            type='button'
            className={`label min-h-11 whitespace-nowrap px-4 ${falseColor ? 'bg-ink text-bg' : 'text-ink hover:bg-raised'}`}
            aria-pressed={falseColor}
            onClick={() => setFalseColor(true)}
          >
            {tasking.viewer.falseColor}
            <span className='max-sm:hidden'> ({tasking.viewer.falseColorNote})</span>
          </button>
        </div>
        <p className='readout text-[12px] text-muted'>
          Scale bar {bar.label} · GSD 0.50 m · Cloud {site.cloudPercent}%
        </p>
      </figcaption>
      {meta ? (
        <dl className='readout mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-4 text-[12px] sm:grid-cols-3 lg:grid-cols-6'>
          {meta.map((m) => (
            <div key={m.label}>
              <dt className='label'>{m.label}</dt>
              <dd className='mt-1 text-amber'>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </figure>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { GlobeEngine, GlobeOptions } from './engine';

/** True when the user asked the system to reduce motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Calls back when the element enters or leaves the viewport. */
export function useInView<T extends Element>(
  ref: React.RefObject<T | null>,
  rootMargin = '0px'
) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/** True while the tab is visible. */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

/** Runs `fn` once the browser is idle after the page has loaded. */
export function afterFirstPaint(fn: () => void) {
  let cancelled = false;
  let idle = 0;
  const run = () => {
    if (cancelled) return;
    const ric = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
      .requestIdleCallback;
    if (ric) idle = ric(() => !cancelled && fn(), { timeout: 1500 });
    else idle = window.setTimeout(() => !cancelled && fn(), 200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    const cic = (window as Window & { cancelIdleCallback?: typeof cancelIdleCallback })
      .cancelIdleCallback;
    if (cic) cic(idle);
    clearTimeout(idle);
  };
}

export type GlobeStatus = 'loading' | 'ready' | 'unavailable';

/**
 * Loads the WebGL globe after first paint and keeps it paused while it is
 * off screen or the tab is hidden.
 */
export function useGlobe(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  makeOptions: () => GlobeOptions | null,
  active: boolean
) {
  const engineRef = useRef<GlobeEngine | null>(null);
  const [status, setStatus] = useState<GlobeStatus>('loading');
  const optionsRef = useRef(makeOptions);
  useEffect(() => {
    optionsRef.current = makeOptions;
  });

  useEffect(() => {
    let disposed = false;
    const observer: { current: ResizeObserver | null } = { current: null };
    const cancel = afterFirstPaint(async () => {
      const canvas = canvasRef.current;
      const opts = optionsRef.current();
      if (!canvas || !opts) return;
      try {
        const mod = await import('./engine');
        if (disposed) return;
        if (!mod.webglAvailable()) throw new Error('no webgl');
        const engine = await mod.GlobeEngine.create(canvas, opts);
        if (disposed) {
          engine.destroy();
          return;
        }
        engineRef.current = engine;
        engine.render();
        observer.current = new ResizeObserver(() => engine.resize());
        observer.current.observe(canvas);
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('unavailable');
      }
    });
    return () => {
      disposed = true;
      cancel();
      observer.current?.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  // Runs again once the engine is ready, so it starts paused when off screen.
  useEffect(() => {
    if (status === 'ready') engineRef.current?.setVisible(active);
  }, [active, status]);

  return { engineRef, status };
}

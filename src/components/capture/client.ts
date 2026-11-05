/**
 * Generates captures off the main thread (a Web Worker with OffscreenCanvas)
 * and caches them, so the tasking demo, gallery, and crops share work.
 */
import type { Site } from '~/content/sites';
import type { Phase } from './scenes';

export type CaptureImages = { trueColor: CanvasImageSource; falseColor: CanvasImageSource };

const cache = new Map<string, Promise<CaptureImages>>();
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: CaptureImages) => void; reject: (e: unknown) => void }>();

function canUseWorker() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && 'transferToImageBitmap' in OffscreenCanvas.prototype;
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./capture.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (e: MessageEvent) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.error) job.reject(new Error(e.data.error));
      else job.resolve({ trueColor: e.data.trueColor, falseColor: e.data.falseColor });
    });
  }
  return worker;
}

async function renderOnMainThread(site: Site, phase: Phase, width: number): Promise<CaptureImages> {
  const { renderCapture } = await import('./render');
  await new Promise((r) => setTimeout(r, 0));
  return renderCapture(site.kind, site.seed, phase, width, (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  });
}

/** Both color versions of one phase of a site, `width` pixels wide (3:2). */
export function getCapture(site: Site, phase: Phase, width: number): Promise<CaptureImages> {
  const key = `${site.id}:${site.seed}:${phase}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = canUseWorker()
    ? new Promise<CaptureImages>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a Worker, not a window
        getWorker().postMessage({ id, kind: site.kind, seed: site.seed, phase, width });
      }).catch(() => renderOnMainThread(site, phase, width))
    : renderOnMainThread(site, phase, width);
  cache.set(key, job);
  return job;
}

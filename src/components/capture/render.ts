import type { SiteKind } from '~/content/sites';
import type { Ctx2D } from './paint';
import { Painter } from './paint';
import type { Phase } from './scenes';
import { scenes } from './scenes';

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

/**
 * Draws one phase of a site into two new canvases: true color and false
 * color (near-infrared as red). Works on the main thread or in a worker.
 */
export function renderCapture<C extends AnyCanvas>(
  kind: SiteKind,
  seed: number,
  phase: Phase,
  width: number,
  create: (w: number, h: number) => C
): { trueColor: C; falseColor: C } {
  const height = Math.round((width * 2) / 3);
  const trueColor = create(width, height);
  const falseColor = create(width, height);
  const opts = { willReadFrequently: true, alpha: false } as const;
  const t = trueColor.getContext('2d', opts) as Ctx2D | null;
  const f = falseColor.getContext('2d', opts) as Ctx2D | null;
  if (!t || !f) throw new Error('2D canvas unavailable');
  scenes[kind](new Painter(t, f, width, height), phase, seed);
  return { trueColor, falseColor };
}

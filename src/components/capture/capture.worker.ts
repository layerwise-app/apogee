/// <reference lib="webworker" />
import type { SiteKind } from '~/content/sites';
import { renderCapture } from './render';
import type { Phase } from './scenes';

type Job = { id: number; kind: SiteKind; seed: number; phase: Phase; width: number };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (e: MessageEvent<Job>) => {
  const { id, kind, seed, phase, width } = e.data;
  try {
    const { trueColor, falseColor } = renderCapture(kind, seed, phase, width, (w, h) => new OffscreenCanvas(w, h));
    const a = trueColor.transferToImageBitmap();
    const b = falseColor.transferToImageBitmap();
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- worker messages have no origin
    scope.postMessage({ id, trueColor: a, falseColor: b }, [a, b]);
  } catch (err) {
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- worker messages have no origin
    scope.postMessage({ id, error: String(err) });
  }
});

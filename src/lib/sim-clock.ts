/**
 * Simulation time. Runs `scale` times faster than real time, and can "warp"
 * smoothly to a future instant (used by the tasking countdown).
 */
export class SimClock {
  private baseReal: number;
  private baseSim: number;
  private warp: {
    fromSim: number;
    toSim: number;
    startReal: number;
    duration: number;
    ease: (t: number) => number;
    resolve: () => void;
  } | null = null;

  constructor(
    startSimMs: number,
    public scale: number,
    private realNow: () => number = () => performance.now()
  ) {
    this.baseReal = realNow();
    this.baseSim = startSimMs;
  }

  now(): number {
    const real = this.realNow();
    if (this.warp) {
      const w = this.warp;
      const t = Math.min(1, (real - w.startReal) / w.duration);
      const sim = w.fromSim + (w.toSim - w.fromSim) * w.ease(t);
      if (t >= 1) {
        this.warp = null;
        this.baseReal = real;
        this.baseSim = w.toSim;
        w.resolve();
        return w.toSim;
      }
      return sim;
    }
    return this.baseSim + (real - this.baseReal) * this.scale;
  }

  get warping() {
    return this.warp !== null;
  }

  setScale(scale: number) {
    const now = this.now();
    this.baseReal = this.realNow();
    this.baseSim = now;
    this.scale = scale;
  }

  /** Moves simulation time to `toSim` over `durationMs` of real time. */
  warpTo(
    toSim: number,
    durationMs: number,
    ease: (t: number) => number = easeInOutCubic
  ): Promise<void> {
    const fromSim = this.now();
    this.warp?.resolve();
    return new Promise((resolve) => {
      this.warp = {
        fromSim,
        toSim,
        startReal: this.realNow(),
        duration: Math.max(1, durationMs),
        ease,
        resolve
      };
    });
  }

  /** Jumps immediately (used with reduced motion). */
  set(simMs: number) {
    this.warp?.resolve();
    this.warp = null;
    this.baseReal = this.realNow();
    this.baseSim = simMs;
  }
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

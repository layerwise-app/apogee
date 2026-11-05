/**
 * Drawing toolkit for generated captures. Every material is a surface
 * reflectance in four bands (blue, green, red, near-infrared). True color
 * shows red-green-blue; false color shows near-infrared-red-green, so healthy
 * vegetation turns red just as in a real color-infrared composite.
 *
 * A Painter draws each shape into two canvases at once (true and false
 * color), so both images come from one pass over the scene.
 */

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Reflectance: blue, green, red, near-infrared (0–1). */
export type Refl = readonly [number, number, number, number];

export const BASE_W = 1536;
export const BASE_H = 1024;

export const M = {
  water: [0.05, 0.045, 0.028, 0.01],
  deepWater: [0.038, 0.032, 0.02, 0.006],
  siltWater: [0.085, 0.11, 0.12, 0.06],
  flood: [0.095, 0.125, 0.15, 0.085],
  veg: [0.035, 0.085, 0.045, 0.43],
  vegStressed: [0.06, 0.105, 0.11, 0.23],
  forest: [0.022, 0.045, 0.026, 0.27],
  grass: [0.05, 0.1, 0.07, 0.34],
  grassDry: [0.1, 0.15, 0.19, 0.25],
  paddyWet: [0.06, 0.09, 0.07, 0.2],
  soil: [0.1, 0.14, 0.19, 0.24],
  soilLight: [0.16, 0.2, 0.25, 0.3],
  sand: [0.3, 0.34, 0.38, 0.42],
  desert: [0.155, 0.185, 0.225, 0.29],
  desertDark: [0.1, 0.115, 0.14, 0.19],
  oxide: [0.08, 0.1, 0.17, 0.21],
  rock: [0.14, 0.15, 0.17, 0.21],
  benchLight: [0.22, 0.25, 0.29, 0.32],
  asphalt: [0.07, 0.075, 0.08, 0.09],
  concrete: [0.24, 0.25, 0.26, 0.28],
  roofLight: [0.42, 0.43, 0.44, 0.46],
  roofWhite: [0.55, 0.56, 0.57, 0.58],
  roofGray: [0.18, 0.185, 0.19, 0.2],
  roofDark: [0.08, 0.085, 0.09, 0.1],
  roofTerracotta: [0.1, 0.13, 0.3, 0.36],
  roofTan: [0.2, 0.24, 0.3, 0.33],
  burnHigh: [0.035, 0.038, 0.042, 0.05],
  burnMod: [0.055, 0.065, 0.1, 0.13],
  ash: [0.14, 0.15, 0.16, 0.17],
  tarp: [0.42, 0.2, 0.06, 0.3],
  boxRed: [0.06, 0.06, 0.32, 0.38],
  boxBlue: [0.28, 0.15, 0.06, 0.28],
  boxWhite: [0.46, 0.47, 0.48, 0.5],
  boxOrange: [0.05, 0.19, 0.45, 0.48],
  boxGreen: [0.07, 0.18, 0.08, 0.22],
  boxGray: [0.17, 0.17, 0.18, 0.19],
  hull: [0.05, 0.05, 0.055, 0.06],
  hullRed: [0.05, 0.05, 0.22, 0.26],
  pond: [0.2, 0.24, 0.1, 0.04],
  tailings: [0.29, 0.31, 0.32, 0.33],
  rail: [0.11, 0.11, 0.12, 0.13]
} satisfies Record<string, Refl>;

export function mixRefl(a: Refl, b: Refl, t: number): Refl {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t
  ];
}

export function scaleRefl(a: Refl, k: number): Refl {
  return [a[0] * k, a[1] * k, a[2] * k, a[3] * k];
}

const WHITE = 0.56;
const GAMMA = 0.55;
const LUT = new Uint8ClampedArray(4096);
for (let i = 0; i < 4096; i++) {
  LUT[i] = Math.round(255 * Math.min(1, Math.pow(i / 4095, GAMMA)));
}
const enc = (v: number) => LUT[Math.max(0, Math.min(4095, Math.round((v / WHITE) * 4095)))];

/** Display color for a reflectance: true color (R,G,B) or false color (NIR,R,G). */
export function display(r: Refl, falseColor: boolean): [number, number, number] {
  if (falseColor) return [enc(r[3] * 0.92), enc(r[2]), enc(r[1])];
  // A little atmospheric haze lifts the blue channel.
  return [enc(r[2]), enc(r[1]), enc(r[0] + 0.012)];
}

export function css(r: Refl, falseColor: boolean) {
  const [a, b, c] = display(r, falseColor);
  return `rgb(${a},${b},${c})`;
}

/* -------------------------------------------------------------------------- */
/* Deterministic randomness and noise                                          */
/* -------------------------------------------------------------------------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Noise {
  private perm: Uint8Array;
  private vals: Float32Array;
  constructor(seed: number) {
    const rnd = mulberry32(seed);
    this.perm = new Uint8Array(512);
    this.vals = new Float32Array(256);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) this.vals[i] = rnd() * 2 - 1;
  }
  /** Smooth value noise in [-1, 1]. */
  value(x: number, y: number) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const p = this.perm;
    const X = xi & 255;
    const Y = yi & 255;
    const a = this.vals[p[p[X] + Y]];
    const b = this.vals[p[p[X + 1] + Y]];
    const c = this.vals[p[p[X] + Y + 1]];
    const d = this.vals[p[p[X + 1] + Y + 1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  fbm(x: number, y: number, octaves = 4, gain = 0.5) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += this.value(x * f + o * 17.3, y * f - o * 9.1) * amp;
      norm += amp;
      amp *= gain;
      f *= 2.03;
    }
    return sum / norm;
  }
  /** Ridged noise for hills and ridgelines, in [0, 1]. */
  ridge(x: number, y: number, octaves = 4) {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      const n = 1 - Math.abs(this.value(x * f + o * 5.7, y * f + o * 3.1));
      sum += n * n * amp;
      amp *= 0.5;
      f *= 2.1;
    }
    return sum;
  }
}

/* -------------------------------------------------------------------------- */
/* Painter                                                                     */
/* -------------------------------------------------------------------------- */

export type Pt = [number, number];

export class Painter {
  readonly w: number;
  readonly h: number;
  /** Output pixels per base unit. */
  readonly k: number;
  constructor(
    readonly t: Ctx2D,
    readonly f: Ctx2D,
    w: number,
    h: number
  ) {
    this.w = w;
    this.h = h;
    this.k = w / BASE_W;
    for (const c of [t, f]) {
      c.setTransform(this.k, 0, 0, h / BASE_H, 0, 0);
      c.lineJoin = 'round';
    }
  }

  /** Draws `fn` in a frame rotated by `rot` around (cx, cy). */
  rotated(cx: number, cy: number, rot: number, fn: () => void) {
    for (const c of [this.t, this.f]) {
      c.save();
      c.translate(cx, cy);
      c.rotate(rot);
    }
    fn();
    for (const c of [this.t, this.f]) c.restore();
  }

  private each(fn: (c: Ctx2D, falseColor: boolean) => void) {
    fn(this.t, false);
    fn(this.f, true);
  }

  fill(mat: Refl, alpha = 1) {
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      c.fillRect(0, 0, BASE_W, BASE_H);
    });
  }

  rect(x: number, y: number, w: number, h: number, mat: Refl, alpha = 1) {
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      c.fillRect(x, y, w, h);
    });
  }

  /** A rectangle rotated by `rot` radians around its centre. */
  rotRect(cx: number, cy: number, w: number, h: number, rot: number, mat: Refl, alpha = 1) {
    this.each((c, fc) => {
      c.save();
      c.translate(cx, cy);
      c.rotate(rot);
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      c.fillRect(-w / 2, -h / 2, w, h);
      c.restore();
    });
  }

  poly(points: Pt[], mat: Refl, alpha = 1) {
    if (points.length < 3) return;
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      c.beginPath();
      c.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
      c.closePath();
      c.fill();
    });
  }

  /** A smooth closed blob through the points. */
  blob(points: Pt[], mat: Refl, alpha = 1) {
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      smoothClosed(c, points);
      c.fill();
    });
  }

  line(points: Pt[], width: number, mat: Refl, alpha = 1, smooth = false, cap: CanvasLineCap = 'round') {
    if (points.length < 2) return;
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.strokeStyle = css(mat, fc);
      c.lineWidth = width;
      c.lineCap = cap;
      if (smooth) smoothOpen(c, points);
      else {
        c.beginPath();
        c.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
      }
      c.stroke();
    });
  }

  circle(x: number, y: number, r: number, mat: Refl, alpha = 1) {
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    });
  }

  ellipse(x: number, y: number, rx: number, ry: number, rot: number, mat: Refl, alpha = 1) {
    this.each((c, fc) => {
      c.globalAlpha = alpha;
      c.fillStyle = css(mat, fc);
      c.beginPath();
      c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      c.fill();
    });
  }

  /** Shadows darken both images the same way. */
  shadowRect(cx: number, cy: number, w: number, h: number, rot: number, dx: number, dy: number, alpha = 0.5) {
    this.each((c) => {
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = '#000';
      c.translate(cx, cy);
      c.rotate(rot);
      c.beginPath();
      const hw = w / 2;
      const hh = h / 2;
      // Unrotate the shadow offset so it falls in screen space.
      const cs = Math.cos(-rot);
      const sn = Math.sin(-rot);
      const ox = dx * cs - dy * sn;
      const oy = dx * sn + dy * cs;
      c.moveTo(-hw, -hh);
      c.lineTo(hw, -hh);
      c.lineTo(hw + ox, -hh + oy);
      c.lineTo(hw + ox, hh + oy);
      c.lineTo(-hw + ox, hh + oy);
      c.lineTo(-hw, hh);
      c.closePath();
      c.fill();
      c.restore();
    });
  }

  /**
   * Per-pixel pass. `fn` gets base coordinates and returns a reflectance and
   * an opacity to lay over what is already drawn, or null to leave it.
   */
  pixels(fn: (x: number, y: number) => { r: Refl; a: number } | null) {
    const { w, h } = this;
    const it = this.t.getImageData(0, 0, w, h);
    const ifc = this.f.getImageData(0, 0, w, h);
    const dt = it.data;
    const df = ifc.data;
    const sx = BASE_W / w;
    const sy = BASE_H / h;
    for (let py = 0; py < h; py++) {
      const y = (py + 0.5) * sy;
      for (let px = 0; px < w; px++) {
        const res = fn((px + 0.5) * sx, y);
        if (!res || res.a <= 0) continue;
        const i = (py * w + px) * 4;
        const a = Math.min(1, res.a);
        const ct = display(res.r, false);
        const cf = display(res.r, true);
        dt[i] += (ct[0] - dt[i]) * a;
        dt[i + 1] += (ct[1] - dt[i + 1]) * a;
        dt[i + 2] += (ct[2] - dt[i + 2]) * a;
        df[i] += (cf[0] - df[i]) * a;
        df[i + 1] += (cf[1] - df[i + 1]) * a;
        df[i + 2] += (cf[2] - df[i + 2]) * a;
      }
    }
    this.t.putImageData(it, 0, 0);
    this.f.putImageData(ifc, 0, 0);
  }

  /** Sensor grain and fine texture, identical in both images. */
  grain(noise: Noise, amount = 0.06, scale = 0.9) {
    const { w, h } = this;
    const it = this.t.getImageData(0, 0, w, h);
    const ifc = this.f.getImageData(0, 0, w, h);
    const dt = it.data;
    const df = ifc.data;
    const sx = BASE_W / w;
    const rnd = mulberry32(911);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const x = px * sx;
        const y = py * sx;
        const m =
          1 +
          noise.value(x * scale, y * scale) * amount +
          noise.value(x * 0.05, y * 0.05) * amount * 0.8 +
          (rnd() - 0.5) * amount * 0.7;
        const i = (py * w + px) * 4;
        dt[i] *= m;
        dt[i + 1] *= m;
        dt[i + 2] *= m;
        df[i] *= m;
        df[i + 1] *= m;
        df[i + 2] *= m;
      }
    }
    this.t.putImageData(it, 0, 0);
    this.f.putImageData(ifc, 0, 0);
  }
}

function smoothClosed(c: Ctx2D, pts: Pt[]) {
  const n = pts.length;
  c.beginPath();
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  c.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  c.closePath();
}

function smoothOpen(c: Ctx2D, pts: Pt[]) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  const last = pts[pts.length - 1];
  c.lineTo(last[0], last[1]);
}

/** A smooth field sampled on a coarse grid and bilinearly interpolated. */
export function coarseField(fn: (x: number, y: number) => number, step = 4) {
  const cols = Math.ceil(BASE_W / step) + 2;
  const rows = Math.ceil(BASE_H / step) + 2;
  const data = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) data[j * cols + i] = fn(i * step, j * step);
  }
  return (x: number, y: number) => {
    const fx = x / step;
    const fy = y / step;
    const i = Math.min(cols - 2, Math.max(0, Math.floor(fx)));
    const j = Math.min(rows - 2, Math.max(0, Math.floor(fy)));
    const u = fx - i;
    const v = fy - j;
    const a = data[j * cols + i];
    const b = data[j * cols + i + 1];
    const c = data[(j + 1) * cols + i];
    const d = data[(j + 1) * cols + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function distToPolyline(x: number, y: number, pts: Pt[]) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) best = d;
  }
  return best;
}

/** Points around an irregular closed shape, for blobs. */
export function wobblyRing(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  noise: Noise,
  amount: number,
  steps = 48,
  rot = 0,
  offset = 0
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + noise.fbm(Math.cos(a) * 1.6 + offset, Math.sin(a) * 1.6 + offset, 3) * amount;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

/** A gently wandering polyline from a to b. */
export function meander(a: Pt, b: Pt, noise: Noise, amp: number, steps = 24, offset = 0): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const env = Math.sin(Math.PI * t);
    const d = noise.fbm(t * 3 + offset, offset * 0.7, 3) * amp * (0.35 + 0.65 * env);
    out.push([a[0] + dx * t + nx * d, a[1] + dy * t + ny * d]);
  }
  return out;
}

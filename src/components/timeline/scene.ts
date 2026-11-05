/**
 * The launch-to-first-light sequence, drawn as 1 px wireframes in Canvas 2D.
 * `drawTimeline(ctx, w, h, p)` renders the state at progress p (0–1); the
 * same function draws the scroll-driven desktop view and the phone stills.
 *
 * World units are kilometres, Earth-centred, with the launch pad at
 * (0, 0, R) and the flight heading along +x. Readouts come from the ascent
 * model in `missionState`.
 */
import { decodeLandDots } from '~/lib/earth/land';
import { unitFromLatLon } from '~/lib/orbits';

type V = [number, number, number];
const R = 6371;
const ALT = 525;

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

export const STAGES = [0, 0.25, 0.5, 0.75, 1] as const;

/* -------------------------------------------------------------------------- */
/* Mission model                                                               */
/* -------------------------------------------------------------------------- */

const SECO = 540; // s
const DEPLOY = 3300; // s
const DAY = 86400;

/** Mission elapsed time in seconds at progress p. */
export function metAt(p: number) {
  if (p < 0.25) return (p / 0.25) * SECO;
  if (p < 0.5) return SECO + ((p - 0.25) / 0.25) * (DEPLOY + 120 - SECO);
  if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    return DEPLOY + 120 + (Math.pow(10, t * 2.6) - 1) / (Math.pow(10, 2.6) - 1) * (21 * DAY);
  }
  return 21 * DAY + ((p - 0.75) / 0.25) * DAY;
}

function altitudeAt(met: number) {
  if (met >= SECO) return ALT;
  const x = met / SECO;
  return ALT * (1 - Math.exp(-Math.pow(x * 3.1, 1.7))) / (1 - Math.exp(-Math.pow(3.1, 1.7)));
}

function downrangeAt(met: number) {
  if (met <= SECO) {
    const x = met / SECO;
    return 1650 * Math.pow(x, 2.2);
  }
  return 1650 + (met - SECO) * 7.6;
}

function speedAt(met: number) {
  if (met >= SECO) return 7.6;
  const x = met / SECO;
  return 0.36 + 7.24 * Math.pow(x, 1.55);
}

export type MissionEvent = { label: string; at: number };

export const EVENTS: MissionEvent[][] = [
  [
    { label: 'Liftoff', at: 0 },
    { label: 'Max-Q', at: 72 },
    { label: 'Stage separation', at: 152 },
    { label: 'Fairing separation', at: 196 },
    { label: 'Orbit insertion', at: SECO }
  ],
  [
    { label: 'Coast to deployment', at: SECO + 60 },
    { label: 'Dispenser armed', at: DEPLOY - 120 },
    { label: 'First satellite released', at: DEPLOY },
    { label: 'All eight released', at: DEPLOY + 70 }
  ],
  [
    { label: 'Solar arrays deployed', at: DEPLOY + 900 },
    { label: 'Star tracker lock', at: DEPLOY + DAY },
    { label: 'Thermal balance', at: 6 * DAY },
    { label: 'Telescope focused', at: 14 * DAY },
    { label: 'Raised into slot', at: 19 * DAY }
  ],
  [
    { label: 'Slewed to target', at: 21 * DAY + 3600 },
    { label: 'First image captured', at: 21 * DAY + 4 * 3600 },
    { label: 'Downlinked over Toulouse', at: 21 * DAY + 4 * 3600 + 900 }
  ]
];

export function missionState(p: number) {
  const met = metAt(p);
  const stage = p >= 0.75 ? 3 : p >= 0.5 ? 2 : p >= 0.25 ? 1 : 0;
  return {
    stage,
    met,
    altKm: altitudeAt(met),
    speedKms: speedAt(met),
    downrangeKm: Math.min(downrangeAt(met), 99999)
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatMet(met: number) {
  if (met >= DAY) return `Day ${pad(Math.floor(met / DAY))}`;
  const s = Math.floor(met);
  return `T+${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/* -------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* -------------------------------------------------------------------------- */

/** Point at altitude h and downrange d along the flight plane. */
function flightPoint(h: number, d: number): V {
  const a = d / R;
  return [(R + h) * Math.sin(a), 0, (R + h) * Math.cos(a)];
}

/** Local frame of a moving object: up (radial), fwd (along track), side. */
function frameAt(pos: V, fwd: V) {
  const up = norm(pos);
  const f = norm(sub(fwd, mul(up, dot(fwd, up))));
  const side = cross(up, f);
  return { up, fwd: f, side };
}

type Seg = [V, V];

function ring(c: V, a: V, b: V, r: number, n = 18): Seg[] {
  const out: Seg[] = [];
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * Math.PI * 2;
    const t1 = ((k + 1) / n) * Math.PI * 2;
    out.push([
      add(c, add(mul(a, Math.cos(t0) * r), mul(b, Math.sin(t0) * r))),
      add(c, add(mul(a, Math.cos(t1) * r), mul(b, Math.sin(t1) * r)))
    ]);
  }
  return out;
}

/** A cylinder along `axis` from base, as rings and long lines. */
function cylinder(base: V, axis: V, a: V, b: V, r: number, h: number, rings = 3, longs = 8): Seg[] {
  const out: Seg[] = [];
  for (let k = 0; k <= rings; k++) out.push(...ring(add(base, mul(axis, (h * k) / rings)), a, b, r));
  for (let k = 0; k < longs; k++) {
    const t = (k / longs) * Math.PI * 2;
    const o = add(mul(a, Math.cos(t) * r), mul(b, Math.sin(t) * r));
    out.push([add(base, o), add(add(base, o), mul(axis, h))]);
  }
  return out;
}

/** A box centred at c with half sizes along the frame axes. */
function box(c: V, x: V, y: V, z: V, hx: number, hy: number, hz: number): Seg[] {
  const corners: V[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    corners.push(add(c, add(mul(x, sx * hx), add(mul(y, sy * hy), mul(z, sz * hz)))));
  }
  const e: [number, number][] = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  return e.map(([i, j]) => [corners[i], corners[j]]);
}

/** A flat panel with cell lines, from hinge edge `o` along u (length) and v (width). */
function panel(o: V, u: V, v: V, lu: number, lv: number, cellsU = 4, cellsV = 2): Seg[] {
  const out: Seg[] = [];
  for (let k = 0; k <= cellsU; k++) {
    const a = add(o, mul(u, (lu * k) / cellsU));
    out.push([a, add(a, mul(v, lv))]);
  }
  for (let k = 0; k <= cellsV; k++) {
    const a = add(o, mul(v, (lv * k) / cellsV));
    out.push([a, add(a, mul(u, lu))]);
  }
  return out;
}

function rotateAbout(v: V, axis: V, ang: number): V {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c)));
}

/* -------------------------------------------------------------------------- */
/* Earth orientation                                                           */
/* -------------------------------------------------------------------------- */

type Mat3 = [V, V, V];

/** Rotation that takes ECEF to the local frame where `site` is +z and `heading` +x. */
function localFrame(lat: number, lon: number, headingDeg: number): Mat3 {
  const up = unitFromLatLon(lat, lon) as V;
  const east = norm(cross([0, 0, 1], up));
  const north = cross(up, east);
  const h = (headingDeg * Math.PI) / 180;
  const x = add(mul(north, Math.cos(h)), mul(east, Math.sin(h)));
  const y = cross(up, x);
  return [x, y, up];
}

let dotsCache: Float32Array | null = null;
function landDots() {
  if (!dotsCache) dotsCache = decodeLandDots();
  return dotsCache;
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                      */
/* -------------------------------------------------------------------------- */

type Cam = { pos: V; right: V; up: V; fwd: V; f: number; cx: number; cy: number };

function makeCam(pos: V, target: V, upHint: V, fovDeg: number, w: number, h: number): Cam {
  const fwd = norm(sub(target, pos));
  let right = cross(fwd, upHint);
  if (len(right) < 1e-6) right = cross(fwd, [1, 0, 0]);
  right = norm(right);
  const up = cross(right, fwd);
  // fovDeg is vertical for a 16:10 frame. Narrower frames (phone stills,
  // 4:3 screens) keep the same horizontal view, so subjects stay in shot.
  const t = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const f = Math.min(h / 2 / t, w / 2 / (1.6 * t));
  return { pos, right, up, fwd, f, cx: w / 2, cy: h / 2 };
}

function toCam(cam: Cam, p: V): V {
  const d = sub(p, cam.pos);
  return [dot(d, cam.right), dot(d, cam.up), dot(d, cam.fwd)];
}

const NEAR = 1e-5;

function projectCam(cam: Cam, c: V): [number, number] {
  return [cam.cx + (c[0] / c[2]) * cam.f, cam.cy - (c[1] / c[2]) * cam.f];
}

function strokeSegs(ctx: CanvasRenderingContext2D, cam: Cam, segs: Seg[]) {
  ctx.beginPath();
  for (const [a, b] of segs) {
    let ca = toCam(cam, a);
    let cb = toCam(cam, b);
    if (ca[2] < NEAR && cb[2] < NEAR) continue;
    if (ca[2] < NEAR) ca = lerpV(ca, cb, (NEAR - ca[2]) / (cb[2] - ca[2]));
    if (cb[2] < NEAR) cb = lerpV(cb, ca, (NEAR - cb[2]) / (ca[2] - cb[2]));
    const [x0, y0] = projectCam(cam, ca);
    const [x1, y1] = projectCam(cam, cb);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
}

/* -------------------------------------------------------------------------- */
/* Draw                                                                        */
/* -------------------------------------------------------------------------- */

export type Palette = { line: string; dim: string; faint: string; accent: string; limb: string; bg: string };

const PALETTE: Palette = {
  line: 'rgba(238,242,247,0.9)',
  dim: 'rgba(196,214,238,0.45)',
  faint: 'rgba(164,186,214,0.16)',
  accent: '#ffb547',
  limb: 'rgba(143,182,255,0.75)',
  bg: '#05070b'
};

const PAD = { lat: 34.63, lon: -120.61, heading: 196 };
const TARGET = { lat: 43.6, lon: 1.44 };

export function drawTimeline(ctx: CanvasRenderingContext2D, w: number, h: number, p: number, dpr = 1) {
  const pal = PALETTE;
  const st = missionState(p);
  ctx.save();
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = dpr;
  ctx.lineCap = 'round';

  /* ----- Subject positions ----- */
  // Ascent and the coast along the orbit, slowed so the camera can follow.
  const ascentMet = Math.min(st.met, SECO);
  const coast = p < 0.25 ? 0 : seg(p, 0.25, 1) * 900;
  const rocketPos = flightPoint(altitudeAt(ascentMet), downrangeAt(ascentMet) + coast);
  const ahead = flightPoint(altitudeAt(Math.min(ascentMet + 2, SECO)), downrangeAt(Math.min(ascentMet + 2, SECO)) + coast + (p >= 0.25 ? 1 : 0));
  // Flight path: vertical at liftoff, horizontal by orbit insertion.
  const gamma = (1 - smooth(ascentMet / SECO)) * (Math.PI / 2) * 0.98;
  const fr0 = frameAt(rocketPos, sub(ahead, rocketPos));
  const axis = norm(add(mul(fr0.up, Math.sin(gamma)), mul(fr0.fwd, Math.cos(gamma))));
  const across = fr0.side;
  const third = cross(axis, across);

  // The hero satellite drifts away from the stack after release.
  const release = smooth(seg(p, 0.33, 0.5));
  const satOffset = add(mul(fr0.up, 0.0035 + release * 0.006), mul(fr0.side, release * 0.004));
  const satPos = add(add(rocketPos, mul(axis, 0.0118)), satOffset);

  /* ----- Camera choreography ----- */
  let camPos: V;
  let target: V;
  let fov = 40;
  const u = fr0.up;
  const fw = fr0.fwd;
  const sd = fr0.side;
  if (p < 0.25) {
    const t = smooth(p / 0.25);
    const dist = lerp(0.16, 0.05, t);
    target = add(rocketPos, mul(axis, lerp(0.035, 0.055, t)));
    camPos = add(target, add(add(mul(sd, dist), mul(fw, -dist * lerp(0.1, 0.9, t))), mul(u, lerp(-0.028, 0.02, t))));
    fov = lerp(42, 36, t);
  } else if (p < 0.5) {
    const t = smooth((p - 0.25) / 0.25);
    const stackC = add(rocketPos, mul(axis, 0.062));
    target = lerpV(stackC, satPos, smooth(seg(p, 0.32, 0.5)));
    const dist = lerp(0.05, 0.011, t);
    camPos = add(target, add(add(mul(sd, dist * 0.8), mul(fw, -dist * 0.6)), mul(u, dist * 0.35)));
    fov = lerp(36, 34, t);
  } else if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    const ang = lerp(0.6, 2.4, smooth(t));
    const dist = 0.0085;
    target = satPos;
    camPos = add(satPos, add(add(mul(sd, Math.cos(ang) * dist), mul(fw, -Math.sin(ang) * dist)), mul(u, dist * 0.32)));
    fov = 34;
  } else {
    const t = smooth((p - 0.75) / 0.25);
    const ang = 2.4;
    const dist = lerp(0.0085, 950, Math.pow(t, 2.4));
    // Keep the satellite in frame while pulling back, then look down at the footprint.
    target = lerpV(satPos, sub(satPos, mul(u, ALT * 0.5)), smooth(seg(p, 0.84, 1)));
    const back = lerpV(add(mul(sd, Math.cos(ang)), mul(fw, -Math.sin(ang))), add(mul(sd, 0.35), mul(fw, -0.8)), t);
    camPos = add(satPos, add(mul(back, dist), mul(u, lerp(0.32, 0.6, t) * dist)));
    fov = lerp(34, 44, t);
  }
  const cam = makeCam(camPos, target, norm(camPos), fov, w, h);

  /* ----- Earth ----- */
  drawEarth(ctx, cam, w, h, p, satPos, pal, dpr);

  /* ----- Launch pad grid (fades with altitude) ----- */
  const padFade = 1 - seg(st.altKm, 0.2, 12);
  if (padFade > 0) {
    ctx.strokeStyle = `rgba(164,186,214,${0.3 * padFade})`;
    const segs: Seg[] = [];
    const base: V = [0, 0, R];
    const ex: V = [1, 0, 0];
    const ey: V = [0, 1, 0];
    const n = 16;
    const s = 0.02;
    for (let k = -n; k <= n; k++) {
      segs.push([add(base, add(mul(ex, k * s), mul(ey, -n * s))), add(base, add(mul(ex, k * s), mul(ey, n * s)))]);
      segs.push([add(base, add(mul(ey, k * s), mul(ex, -n * s))), add(base, add(mul(ey, k * s), mul(ex, n * s)))]);
    }
    strokeSegs(ctx, cam, segs);
    // Launch tower.
    ctx.strokeStyle = `rgba(196,214,238,${0.5 * padFade})`;
    strokeSegs(ctx, cam, box(add(base, [-0.012, 0, 0.04]), ex, ey, [0, 0, 1], 0.003, 0.003, 0.04));
  }

  /* ----- Rocket ----- */
  const stageSep = st.met >= 152;
  const fairingSep = st.met >= 196;
  const r = 0.00185;
  ctx.strokeStyle = pal.line;
  if (p < 0.5) {
    // First stage, then falling away after separation.
    if (!stageSep || p < 0.2) {
      const drop = stageSep ? (st.met - 152) * 0.00012 : 0;
      const b1 = sub(rocketPos, mul(axis, drop));
      ctx.strokeStyle = stageSep ? pal.dim : pal.line;
      strokeSegs(ctx, cam, cylinder(b1, axis, across, third, r, 0.045, 5, 8));
      // Engine bells.
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        const c = add(b1, add(mul(across, Math.cos(a) * r * 0.5), mul(third, Math.sin(a) * r * 0.5)));
        strokeSegs(ctx, cam, ring(c, across, third, r * 0.32, 10));
      }
      // Plume while the first stage burns.
      if (!stageSep) {
        ctx.strokeStyle = 'rgba(238,242,247,0.35)';
        const plume: Seg[] = [];
        const L = 0.03 + Math.min(1, st.altKm / 30) * 0.08;
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          const spread = 0.25 + Math.min(1, st.altKm / 40) * 1.2;
          const dir = norm(add(mul(axis, -1), add(mul(across, Math.cos(a) * spread * 0.3), mul(third, Math.sin(a) * spread * 0.3))));
          plume.push([rocketPos, add(rocketPos, mul(dir, L * (0.7 + 0.3 * ((k * 7) % 5) / 5)))]);
        }
        strokeSegs(ctx, cam, plume);
      }
    }
    ctx.strokeStyle = pal.line;
    // Second stage.
    const b2 = add(rocketPos, mul(axis, 0.045));
    strokeSegs(ctx, cam, cylinder(b2, axis, across, third, r, 0.012, 2, 8));
    if (stageSep && !fairingSep) {
      ctx.strokeStyle = 'rgba(238,242,247,0.35)';
      strokeSegs(ctx, cam, [[b2, sub(b2, mul(axis, 0.02))]]);
      ctx.strokeStyle = pal.line;
    }
    // Payload stack: dispenser with eight satellites.
    const stackBase = add(rocketPos, mul(axis, 0.057));
    if (fairingSep || p > 0.24) {
      strokeSegs(ctx, cam, cylinder(stackBase, axis, across, third, r * 0.3, 0.01, 2, 6));
      for (let k = 0; k < 8; k++) {
        const released = p >= 0.33 + k * 0.012;
        if (k === 0) continue; // the hero satellite is drawn on its own
        const a = (k / 4) * Math.PI * 2;
        const lvl = k < 4 ? 0.003 : 0.0075;
        const off = released ? (p - 0.33 - k * 0.012) * 0.06 : 0;
        const radial = add(mul(across, Math.cos(a)), mul(third, Math.sin(a)));
        const c = add(add(stackBase, mul(axis, lvl)), mul(radial, r * 0.62 + off));
        ctx.strokeStyle = released ? pal.dim : pal.line;
        strokeSegs(ctx, cam, box(c, radial, axis, cross(radial, axis), 0.0004, 0.0008, 0.0006));
      }
      ctx.strokeStyle = pal.line;
    }
    // Fairing: closed on the way up, then two halves swing away.
    const fb = add(rocketPos, mul(axis, 0.057));
    const open = fairingSep ? smooth((st.met - 196) / 60) : 0;
    for (const sideSign of [-1, 1]) {
      if (p >= 0.25 && open >= 1) break;
      const hinge = add(fb, mul(across, sideSign * r));
      const segs: Seg[] = [];
      const steps = 6;
      for (let k = 0; k <= steps; k++) {
        const z = (k / steps) * 0.013;
        const rr = r * Math.sqrt(1 - Math.pow(k / steps, 2.2)) + 0.0001;
        const c = add(fb, mul(axis, z));
        const half: Seg[] = [];
        for (let j = 0; j < 8; j++) {
          const a0 = -Math.PI / 2 + (j / 8) * Math.PI;
          const a1 = -Math.PI / 2 + ((j + 1) / 8) * Math.PI;
          const q0 = add(c, add(mul(across, Math.cos(a0) * rr * sideSign), mul(third, Math.sin(a0) * rr)));
          const q1 = add(c, add(mul(across, Math.cos(a1) * rr * sideSign), mul(third, Math.sin(a1) * rr)));
          half.push([q0, q1]);
        }
        segs.push(...half);
      }
      const rotated = segs.map(([a, b]) => {
        const ang = open * 1.4 * sideSign;
        const drift = mul(across, sideSign * open * 0.02);
        return [add(add(hinge, rotateAbout(sub(a, hinge), third, ang)), drift), add(add(hinge, rotateAbout(sub(b, hinge), third, ang)), drift)] as Seg;
      });
      ctx.strokeStyle = open > 0 ? pal.dim : pal.line;
      strokeSegs(ctx, cam, rotated);
    }
  }

  /* ----- The hero satellite ----- */
  if (p >= 0.2) {
    // Points its telescope at the ground for first light.
    const slew = smooth(seg(p, 0.78, 0.86));
    const satUp = norm(lerpV(axis, mul(u, -1), slew));
    // Arrays deploy sideways, across the orbit track.
    const satX = norm(sub(across, mul(satUp, dot(across, satUp))));
    const satY = cross(satUp, satX);
    ctx.strokeStyle = pal.line;
    strokeSegs(ctx, cam, box(satPos, satX, satUp, satY, 0.0006, 0.0008, 0.0006));
    strokeSegs(ctx, cam, cylinder(add(satPos, mul(satUp, 0.0008)), satUp, satX, satY, 0.00035, 0.0007, 2, 8));
    // Solar arrays unfold from the bus sides.
    const unfold = smooth(seg(p, 0.52, 0.64));
    for (const s of [-1, 1]) {
      const hinge = add(add(satPos, mul(satX, 0.0006 * s)), mul(satUp, -0.0008));
      const folded = satUp;
      const deployed = mul(satX, s);
      const dir = norm(lerpV(folded, deployed, unfold));
      ctx.strokeStyle = unfold > 0 && unfold < 1 ? pal.accent : pal.line;
      strokeSegs(ctx, cam, panel(add(hinge, mul(satY, -0.0006)), dir, satY, 0.0026, 0.0012, 5, 2));
    }
    // A reticle when the satellite is too small to see.
    const cs = toCam(cam, satPos);
    if (cs[2] > 0.3) {
      const [x, y] = projectCam(cam, cs);
      ctx.strokeStyle = pal.accent;
      const s = 9 * dpr;
      ctx.beginPath();
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(x + dx * s, y + dy * s * 0.4);
        ctx.lineTo(x + dx * s, y + dy * s);
        ctx.lineTo(x + dx * s * 0.4, y + dy * s);
      }
      ctx.stroke();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr);
    }
    // First light: the field of regard on the ground.
    const look = seg(p, 0.84, 0.95);
    if (look > 0) {
      const nadir = mul(norm(satPos), R);
      const half = 190 * look;
      const ax = norm(fw);
      const ay = norm(sd);
      const corners: V[] = [
        add(nadir, add(mul(ax, half), mul(ay, half))),
        add(nadir, add(mul(ax, half), mul(ay, -half))),
        add(nadir, add(mul(ax, -half), mul(ay, -half))),
        add(nadir, add(mul(ax, -half), mul(ay, half)))
      ].map((c) => mul(norm(c), R + 0.5));
      ctx.strokeStyle = pal.accent;
      strokeSegs(ctx, cam, corners.map((c, k) => [c, corners[(k + 1) % 4]] as Seg));
      ctx.strokeStyle = 'rgba(255,181,71,0.45)';
      strokeSegs(ctx, cam, corners.map((c) => [satPos, c] as Seg));
      // Scan lines sweeping across the scene.
      const scan = seg(p, 0.9, 1);
      if (scan > 0) {
        const lines: Seg[] = [];
        const nL = Math.floor(scan * 12);
        for (let k = 0; k <= nL; k++) {
          const t = k / 12;
          const a = lerpV(corners[0], corners[3], t);
          const b = lerpV(corners[1], corners[2], t);
          lines.push([a, b]);
        }
        strokeSegs(ctx, cam, lines);
      }
    }
  }
  ctx.restore();
}

/** Earth: dark body under the limb, graticule, and land dots that turn beneath the orbit. */
function drawEarth(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number, p: number, satPos: V, pal: Palette, dpr: number) {
  const C = cam.pos;
  const dC = len(C);
  const alt = dC - R;
  // Limb circle: points on the sphere tangent to the line of sight.
  const k = (R * R) / (dC * dC);
  const centre = mul(C, k);
  const rad = R * Math.sqrt(Math.max(0, 1 - k));
  const n = norm(C);
  const a = norm(cross(n, Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const b = cross(n, a);
  const limb: [number, number][] = [];
  let allFront = true;
  const steps = 180;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const q = add(centre, add(mul(a, Math.cos(t) * rad), mul(b, Math.sin(t) * rad)));
    const c = toCam(cam, q);
    if (c[2] <= NEAR) {
      allFront = false;
      limb.push([NaN, NaN]);
      continue;
    }
    limb.push(projectCam(cam, c));
  }

  // Fill the body of the Earth.
  ctx.fillStyle = '#081019';
  ctx.beginPath();
  if (allFront) {
    limb.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  } else {
    const pts = limb.filter(([x]) => !Number.isNaN(x)).filter(([x]) => x > -w * 4 && x < w * 5);
    pts.sort((p1, p2) => p1[0] - p2[0]);
    if (pts.length > 1) {
      ctx.moveTo(-10, h + 10);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(w + 10, h + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pal.limb;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }
  if (allFront) {
    ctx.strokeStyle = pal.limb;
    ctx.beginPath();
    limb.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  // Land dots: the launch site under the pad at first, turning so Toulouse is
  // below the satellite by first light.
  const turn = smooth(seg(p, 0.52, 0.9));
  const m0 = localFrame(PAD.lat, PAD.lon, PAD.heading);
  const satDir = norm(satPos);
  // Frame placing Toulouse under the satellite.
  const m1raw = localFrame(TARGET.lat, TARGET.lon, 180);
  const m1 = alignTo(m1raw, satDir);
  const dots = landDots();
  const visCos = R / dC;
  ctx.fillStyle = `rgba(160,180,206,${alt < 50 ? 0.3 : 0.62})`;
  // Dots are ~83 km apart; size them to the spacing so land reads as land.
  const spacing = 83;
  for (let i = 0; i < dots.length; i += 3) {
    const e: V = [dots[i], dots[i + 1], dots[i + 2]];
    const l0: V = [dot(m0[0], e), dot(m0[1], e), dot(m0[2], e)];
    let lp = l0;
    if (turn > 0) {
      const l1 = applyFrame(m1, e);
      lp = norm(lerpV(l0, l1, turn));
    }
    if (dot(lp, n) < visCos) continue;
    const c = toCam(cam, mul(lp, R));
    if (c[2] <= NEAR) continue;
    const [x, y] = projectCam(cam, c);
    if (x < 0 || y < 0 || x > w || y > h) continue;
    const size = Math.max(dpr, Math.min(5 * dpr, ((cam.f * spacing) / c[2]) * 0.28));
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }

  // Graticule every 10°, in the local frame.
  ctx.strokeStyle = pal.faint;
  const segs: Seg[] = [];
  for (let lat = -80; lat <= 80; lat += 10) {
    for (let lon = -180; lon < 180; lon += 4) {
      const p0 = mul(unitFromLatLon(lat, lon) as V, R);
      const p1 = mul(unitFromLatLon(lat, lon + 4) as V, R);
      if (dot(norm(p0), n) < visCos || dot(norm(p1), n) < visCos) continue;
      segs.push([p0, p1]);
    }
  }
  for (let lon = -180; lon < 180; lon += 10) {
    for (let lat = -88; lat < 88; lat += 4) {
      const p0 = mul(unitFromLatLon(lat, lon) as V, R);
      const p1 = mul(unitFromLatLon(lat + 4, lon) as V, R);
      if (dot(norm(p0), n) < visCos || dot(norm(p1), n) < visCos) continue;
      segs.push([p0, p1]);
    }
  }
  strokeSegs(ctx, cam, segs);
}

function applyFrame(m: Mat3, e: V): V {
  return [dot(m[0], e), dot(m[1], e), dot(m[2], e)];
}

/** Composes a local frame with a rotation taking +z to `dir`. */
function alignTo(m: Mat3, dir: V): Mat3 {
  const z: V = [0, 0, 1];
  const axis = cross(z, dir);
  const s = len(axis);
  const c = dot(z, dir);
  if (s < 1e-9) return m;
  const ax = mul(axis, 1 / s);
  const ang = Math.atan2(s, c);
  // Rows of the composed matrix: rotate each output axis back.
  const rx = rotateAbout([1, 0, 0], ax, -ang);
  const ry = rotateAbout([0, 1, 0], ax, -ang);
  const rz = rotateAbout([0, 0, 1], ax, -ang);
  const col = (v: V): V => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
  return [col(rx), col(ry), col(rz)];
}

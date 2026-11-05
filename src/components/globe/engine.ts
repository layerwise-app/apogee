/**
 * The WebGL globe: dotted landmasses from Natural Earth, a day-night
 * terminator, a thin atmosphere rim, the 48 satellites on their orbits, and
 * ground tracks. Drawn in ECEF with Earth radius = 1.
 *
 * Loaded after first paint (see GlobeCanvas.tsx). Everything it shows comes
 * from src/lib/orbits.ts; nothing is random.
 */
import { decodeLandDots } from '~/lib/earth/land';
import type { Satellite, Vec3 } from '~/lib/orbits';
import {
  R_EQUATOR,
  eciPosition,
  eciToEcef,
  gmst,
  groundTrack,
  orbitRing,
  sunDirectionEcef,
  unitFromLatLon
} from '~/lib/orbits';
import type { SimClock } from '~/lib/sim-clock';
import { lookAt, multiply, perspective, transform } from './gl-math';
import type { Mat4 } from './gl-math';

const DEG = Math.PI / 180;

export type GlobeMode = 'hero' | 'tasking';

export type GlobeOptions = {
  mode: GlobeMode;
  sats: Satellite[];
  clock: SimClock;
  view: { lon: number; lat: number };
  distance: number;
  /** Degrees per second of slow spin when idle (0 to disable). */
  spin: number;
  reducedMotion: boolean;
  onSelectSatellite?: (index: number) => void;
  onPickPoint?: (lat: number, lon: number) => void;
  /** Called about ten times a second with the sim time. */
  onTick?: (simMs: number) => void;
};

type Program = {
  program: WebGLProgram;
  attribs: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

const SPHERE_VS = `
attribute vec3 aPos;
uniform mat4 uMVP;
varying vec3 vN;
void main() {
  vN = aPos;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;

const SPHERE_FS = `
precision mediump float;
varying vec3 vN;
uniform vec3 uSun;
uniform vec3 uEye;
void main() {
  vec3 n = normalize(vN);
  float d = dot(n, uSun);
  float day = smoothstep(-0.06, 0.2, d);
  vec3 night = vec3(0.010, 0.016, 0.027);
  vec3 dayc = vec3(0.034, 0.054, 0.086);
  vec3 c = mix(night, dayc, day);
  float term = 1.0 - smoothstep(0.0, 0.04, abs(d + 0.01));
  c += vec3(0.030, 0.040, 0.055) * term;
  vec3 v = normalize(uEye - n);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.6);
  c += vec3(0.07, 0.13, 0.24) * rim * (0.25 + 0.75 * day);
  gl_FragColor = vec4(c, 1.0);
}`;

const DOTS_VS = `
attribute vec3 aPos;
uniform mat4 uMVP;
uniform vec3 uEye;
uniform vec3 uSun;
uniform float uSize;
varying float vA;
varying float vDay;
void main() {
  vec3 v = normalize(uEye - aPos);
  float f = dot(aPos, v);
  vA = smoothstep(0.04, 0.42, f);
  vDay = smoothstep(-0.08, 0.18, dot(aPos, uSun));
  gl_Position = uMVP * vec4(aPos * 1.0015, 1.0);
  gl_PointSize = uSize * (0.5 + 0.5 * f);
}`;

const DOTS_FS = `
precision mediump float;
varying float vA;
varying float vDay;
uniform vec3 uDay;
uniform vec3 uNight;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0 || vA < 0.01) discard;
  float a = vA * (1.0 - smoothstep(0.45, 1.0, r)) * mix(0.5, 0.88, vDay);
  vec3 c = mix(uNight, uDay, vDay);
  gl_FragColor = vec4(c * a, a);
}`;

const LINES_VS = `
attribute vec3 aPos;
attribute float aAlpha;
attribute float aDash;
uniform mat4 uMVP;
varying float vAlpha;
varying float vDash;
void main() {
  vAlpha = aAlpha;
  vDash = aDash;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;

const LINES_FS = `
precision mediump float;
varying float vAlpha;
varying float vDash;
uniform vec4 uColor;
uniform float uDashed;
void main() {
  if (uDashed > 0.5 && fract(vDash) > 0.5) discard;
  float a = uColor.a * vAlpha;
  gl_FragColor = vec4(uColor.rgb * a, a);
}`;

const POINTS_VS = `
attribute vec3 aPos;
uniform mat4 uMVP;
uniform float uSize;
void main() {
  gl_Position = uMVP * vec4(aPos, 1.0);
  gl_PointSize = uSize;
}`;

// uShape: 0 = round dot, 1 = corner brackets, 2 = crosshair
const POINTS_FS = `
precision mediump float;
uniform vec4 uColor;
uniform float uShape;
uniform float uLine;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a = 0.0;
  if (uShape < 0.5) {
    float r = length(p);
    a = 1.0 - smoothstep(0.55, 1.0, r);
  } else if (uShape < 1.5) {
    vec2 q = abs(p);
    float t = uLine;
    bool vx = q.x > 1.0 - 2.0 * t && q.y > 0.55;
    bool hy = q.y > 1.0 - 2.0 * t && q.x > 0.55;
    a = (vx || hy) ? 1.0 : 0.0;
  } else {
    vec2 q = abs(p);
    float t = uLine;
    bool h = q.y < t && q.x > 0.32;
    bool v = q.x < t && q.y > 0.32;
    float r = length(p);
    bool ring = abs(r - 0.5) < t;
    a = (h || v || ring) ? 1.0 : 0.0;
  }
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uColor.rgb * uColor.a * a, uColor.a * a);
}`;

const HALO_VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const HALO_FS = `
precision mediump float;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec3 uSunView;
void main() {
  vec2 d = gl_FragCoord.xy - uCenter;
  float r = length(d);
  float x = (r - uRadius) / uRadius;
  vec2 dir = d / max(r, 1.0);
  float lit = clamp(dot(dir, normalize(uSunView.xy + vec2(1e-5))) * 0.5 + 0.5, 0.0, 1.0);
  lit = mix(lit, 1.0, clamp(-uSunView.z, 0.0, 1.0) * 0.6);
  float outer = x > 0.0 ? exp(-x * 110.0) : 0.0;
  float edge = exp(-abs(x) * 600.0);
  float inner = x < 0.0 ? exp(x * 34.0) * 0.22 : 0.0;
  float k = (outer * 0.38 + edge * 0.55 + inner) * mix(0.14, 0.9, lit);
  vec3 c = vec3(0.42, 0.62, 1.0) * k;
  gl_FragColor = vec4(c, k);
}`;

type PendingProgram = {
  program: WebGLProgram;
  shaders: [WebGLShader, WebGLShader];
  attribs: string[];
  uniforms: string[];
};

/**
 * Starts compiling and linking without asking for the result, so the GPU
 * process can work while the page stays responsive. `finishProgram` checks it.
 */
function startProgram(gl: WebGLRenderingContext, vs: string, fs: string, attribs: string[], uniforms: string[]): PendingProgram {
  const make = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const shaders: [WebGLShader, WebGLShader] = [make(gl.VERTEX_SHADER, vs), make(gl.FRAGMENT_SHADER, fs)];
  const program = gl.createProgram()!;
  gl.attachShader(program, shaders[0]);
  gl.attachShader(program, shaders[1]);
  gl.linkProgram(program);
  return { program, shaders, attribs, uniforms };
}

function finishProgram(gl: WebGLRenderingContext, p: PendingProgram): Program {
  if (!gl.getProgramParameter(p.program, gl.LINK_STATUS)) {
    const log = p.shaders.map((sh) => gl.getShaderInfoLog(sh)).join(' ') || gl.getProgramInfoLog(p.program);
    throw new Error(log || 'program link failed');
  }
  const a: Record<string, number> = {};
  for (const name of p.attribs) a[name] = gl.getAttribLocation(p.program, name);
  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const name of p.uniforms) u[name] = gl.getUniformLocation(p.program, name);
  return { program: p.program, attribs: a, uniforms: u };
}

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type ProgramName = 'sphere' | 'dots' | 'lines' | 'points' | 'halo';

type Prepared = {
  gl: WebGLRenderingContext;
  programs: Record<ProgramName, Program>;
  sphere: { pos: Float32Array<ArrayBuffer>; idx: Uint16Array<ArrayBuffer> };
  dots: Float32Array<ArrayBuffer>;
  grat: Float32Array<ArrayBuffer>;
};

function sphereMesh(latSeg: number, lonSeg: number) {
  const pos: number[] = [];
  for (let i = 0; i <= latSeg; i++) {
    const lat = -Math.PI / 2 + (i / latSeg) * Math.PI;
    for (let j = 0; j <= lonSeg; j++) {
      const lon = (j / lonSeg) * 2 * Math.PI;
      pos.push(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < latSeg; i++) {
    for (let j = 0; j < lonSeg; j++) {
      const a = i * (lonSeg + 1) + j;
      const b = a + lonSeg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
}

function graticule(): Float32Array<ArrayBuffer> {
  const out: number[] = [];
  const r = 1.0008;
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let k = 0; k < 180; k++) {
      const a = unitFromLatLon(lat, k * 2);
      const b = unitFromLatLon(lat, (k + 1) * 2);
      out.push(a[0] * r, a[1] * r, a[2] * r, b[0] * r, b[1] * r, b[2] * r);
    }
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let k = 0; k < 90; k++) {
      const a = unitFromLatLon(-90 + k * 2, lon);
      const b = unitFromLatLon(-90 + (k + 1) * 2, lon);
      out.push(a[0] * r, a[1] * r, a[2] * r, b[0] * r, b[1] * r, b[2] * r);
    }
  }
  return new Float32Array(out);
}

/** A circle on the ground around a target, as line segments. */
function groundRing(lat: number, lon: number, radiusKm: number): Float32Array {
  const c = unitFromLatLon(lat, lon);
  // Two unit vectors perpendicular to the centre.
  const e = Math.abs(c[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let ux = c[1] * e[2] - c[2] * e[1];
  let uy = c[2] * e[0] - c[0] * e[2];
  let uz = c[0] * e[1] - c[1] * e[0];
  const ul = Math.hypot(ux, uy, uz);
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = c[1] * uz - c[2] * uy;
  const vy = c[2] * ux - c[0] * uz;
  const vz = c[0] * uy - c[1] * ux;
  const ang = radiusKm / 6371;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const out: number[] = [];
  const r = 1.003;
  const pt = (t: number) => {
    const ct = Math.cos(t);
    const st = Math.sin(t);
    return [
      (c[0] * ca + (ux * ct + vx * st) * sa) * r,
      (c[1] * ca + (uy * ct + vy * st) * sa) * r,
      (c[2] * ca + (uz * ct + vz * st) * sa) * r
    ];
  };
  const steps = 64;
  for (let k = 0; k < steps; k++) {
    out.push(...pt((k / steps) * Math.PI * 2), ...pt(((k + 1) / steps) * Math.PI * 2));
  }
  return new Float32Array(out);
}

export class GlobeEngine {
  readonly gl: WebGLRenderingContext;
  private opts: GlobeOptions;
  private canvas: HTMLCanvasElement;
  private programs: Record<ProgramName, Program>;
  private buffers: Record<string, WebGLBuffer>;
  private sphereCount: number;
  private dotCount: number;
  private gratCount: number;
  private dpr = 1;
  private width = 1;
  private height = 1;
  private raf = 0;
  private running = false;
  private visible = true;
  private lastFrame = 0;
  private lastTick = 0;
  private mvp: Mat4 = new Float32Array(16);
  private eye: Vec3 = [0, 0, 3];
  private satEcef = new Float32Array(48 * 3);
  private needsFrame = true;

  // Camera state, degrees.
  yaw: number;
  pitch: number;
  dist: number;
  private yawVel: number;
  private target: { yaw: number; pitch: number; dist: number } | null = null;
  private homePitch: number;
  private dragging = false;
  private dragMoved = 0;
  private lastPointer = { x: 0, y: 0, t: 0 };
  private pointerId: number | null = null;

  /** Highlighted satellite, or -1. */
  selected = -1;
  /** Tasking target, shown as a crosshair inside the area a satellite can image it from. */
  site: { lat: number; lon: number; radiusKm: number } | null = null;
  /** Ground track window around now, minutes. */
  trackWindow = { past: 40, future: 55 };
  /** Draw the selected satellite's future track as a dashed line. */
  showFutureTrack = true;
  /** When set, the selected track's past segment is drawn in the accent color. */
  emphasizeTrack = false;

  /**
   * Sets up the globe in small steps (shaders compile in the background,
   * geometry is built between yields), so loading it never blocks input.
   */
  static async create(canvas: HTMLCanvasElement, opts: GlobeOptions): Promise<GlobeEngine> {
    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    if (!gl) throw new Error('WebGL unavailable');
    const pending: Record<ProgramName, PendingProgram> = {
      sphere: startProgram(gl, SPHERE_VS, SPHERE_FS, ['aPos'], ['uMVP', 'uSun', 'uEye']),
      dots: startProgram(gl, DOTS_VS, DOTS_FS, ['aPos'], ['uMVP', 'uEye', 'uSun', 'uSize', 'uDay', 'uNight']),
      lines: startProgram(gl, LINES_VS, LINES_FS, ['aPos', 'aAlpha', 'aDash'], ['uMVP', 'uColor', 'uDashed']),
      points: startProgram(gl, POINTS_VS, POINTS_FS, ['aPos'], ['uMVP', 'uSize', 'uColor', 'uShape', 'uLine']),
      halo: startProgram(gl, HALO_VS, HALO_FS, ['aPos'], ['uCenter', 'uRadius', 'uSunView'])
    };
    await yieldToMain();
    const sphere = sphereMesh(48, 96);
    await yieldToMain();
    const dots = decodeLandDots();
    const grat = graticule();
    // Wait for the shaders without blocking, where the browser allows it.
    const parallel = gl.getExtension('KHR_parallel_shader_compile');
    if (parallel) {
      const started = performance.now();
      const done = () =>
        Object.values(pending).every((p) => gl.getProgramParameter(p.program, parallel.COMPLETION_STATUS_KHR));
      while (!done() && performance.now() - started < 8000) {
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    } else {
      await yieldToMain();
    }
    const programs = Object.fromEntries(
      Object.entries(pending).map(([name, p]) => [name, finishProgram(gl, p)])
    ) as Record<ProgramName, Program>;
    await yieldToMain();
    return new GlobeEngine(canvas, opts, { gl, programs, sphere, dots, grat });
  }

  private constructor(canvas: HTMLCanvasElement, opts: GlobeOptions, prepared: Prepared) {
    const { gl, programs, sphere, dots, grat } = prepared;
    this.gl = gl;
    this.canvas = canvas;
    this.opts = opts;
    this.yaw = opts.view.lon;
    this.pitch = opts.view.lat;
    this.homePitch = opts.view.lat;
    this.dist = opts.distance;
    this.yawVel = opts.reducedMotion ? 0 : -opts.spin;
    this.programs = programs;

    const buf = (data: BufferSource, target: number = gl.ARRAY_BUFFER, usage: number = gl.STATIC_DRAW) => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, usage);
      return b;
    };
    this.sphereCount = sphere.idx.length;
    this.dotCount = dots.length / 3;
    this.gratCount = grat.length / 3;
    this.buffers = {
      spherePos: buf(sphere.pos),
      sphereIdx: buf(sphere.idx, gl.ELEMENT_ARRAY_BUFFER),
      dots: buf(dots),
      grat: buf(grat),
      quad: buf(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])),
      dyn: buf(new Float32Array(4096 * 3), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
      dynAlpha: buf(new Float32Array(4096), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
      dynDash: buf(new Float32Array(4096), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
      ones: buf(new Float32Array(4096).fill(1)),
      zeros: buf(new Float32Array(4096))
    };

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.attachPointer();
    this.resize();
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) {
      this.needsFrame = true;
      this.start();
    } else this.stop();
  }

  destroy() {
    this.stop();
    this.detachPointer();
    const ext = this.gl.getExtension('WEBGL_lose_context');
    ext?.loseContext();
  }

  /** Request one redraw (reduced motion renders on demand). */
  invalidate() {
    this.needsFrame = true;
    if (this.visible) this.start();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.invalidate();
  }

  /** Eases the camera to face a place. */
  flyTo(lat: number, lon: number, dist = this.dist) {
    // Take the short way round.
    let dy = lon - this.yaw;
    dy = ((dy + 540) % 360) - 180;
    this.target = { yaw: this.yaw + dy, pitch: Math.max(-65, Math.min(65, lat)), dist };
    this.invalidate();
  }

  /** Stops following a target and returns to the slow spin. */
  release() {
    this.target = null;
    this.invalidate();
  }

  /** Turns the globe by keyboard, degrees. */
  nudge(dYaw: number, dPitch: number) {
    if (this.target) {
      this.target.yaw += dYaw;
      this.target.pitch = Math.max(-70, Math.min(70, this.target.pitch + dPitch));
    } else {
      this.yaw += dYaw;
      this.pitch = Math.max(-70, Math.min(70, this.pitch + dPitch));
      this.yawVel = 0;
    }
    this.invalidate();
  }

  /** The latitude/longitude under the centre of the view. */
  centerLatLon() {
    return { lat: this.pitch, lon: ((this.yaw + 540) % 360) - 180 };
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.dragMoved = 0;
    this.pointerId = e.pointerId;
    this.lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.canvas.setPointerCapture?.(e.pointerId);
    this.invalidate();
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    const dt = Math.max(1, now - this.lastPointer.t) / 1000;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    const rect = this.canvas.getBoundingClientRect();
    // Degrees per CSS pixel so the surface follows the finger.
    const k = (180 / Math.PI) * (2 / Math.min(rect.width, rect.height)) * (this.dist - 1) * 0.55;
    this.yaw -= dx * k;
    this.pitch = Math.max(-70, Math.min(70, this.pitch + dy * k));
    if (this.target) {
      this.target.yaw -= dx * k;
      this.target.pitch = Math.max(-70, Math.min(70, this.target.pitch + dy * k));
    }
    this.yawVel = this.yawVel * 0.5 + (-dx * k / dt) * 0.5;
    this.lastPointer = { x: e.clientX, y: e.clientY, t: now };
    this.invalidate();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
    if (this.dragMoved < 6) {
      this.yawVel = this.target || this.opts.reducedMotion ? 0 : -this.opts.spin;
      this.handleClick(e.clientX, e.clientY);
    }
    if (performance.now() - this.lastPointer.t > 80) this.yawVel = 0;
    this.yawVel = Math.max(-120, Math.min(120, this.yawVel));
    this.invalidate();
  };

  private onCancel = () => {
    this.dragging = false;
    this.pointerId = null;
  };

  private attachPointer() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onCancel);
  }

  private detachPointer() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
  }

  private handleClick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * this.dpr;
    const y = (clientY - rect.top) * this.dpr;
    if (this.opts.onSelectSatellite) {
      let best = -1;
      let bestD = 26 * this.dpr;
      for (let i = 0; i < this.opts.sats.length; i++) {
        const p = this.project(this.satEcef[i * 3], this.satEcef[i * 3 + 1], this.satEcef[i * 3 + 2]);
        if (!p || p.hidden) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0) {
        this.opts.onSelectSatellite(best);
        return;
      }
    }
    if (this.opts.onPickPoint) {
      const hit = this.raySphere(x, y);
      if (hit) this.opts.onPickPoint(hit.lat, hit.lon);
    }
  }

  /** Screen position (device px) of an ECEF point, and whether Earth hides it. */
  project(x: number, y: number, z: number) {
    const c = transform(this.mvp, x, y, z);
    if (c[3] <= 0) return null;
    const sx = ((c[0] / c[3]) * 0.5 + 0.5) * this.width;
    const sy = (1 - ((c[1] / c[3]) * 0.5 + 0.5)) * this.height;
    // Hidden if the line from the eye to the point passes through the globe.
    const e = this.eye;
    const dx = x - e[0];
    const dy = y - e[1];
    const dz = z - e[2];
    const len = Math.hypot(dx, dy, dz);
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    const b = e[0] * ux + e[1] * uy + e[2] * uz;
    const cc = e[0] * e[0] + e[1] * e[1] + e[2] * e[2] - 1;
    const disc = b * b - cc;
    let hidden = false;
    if (disc > 0) {
      const t = -b - Math.sqrt(disc);
      hidden = t > 0 && t < len - 1e-4;
    }
    return { x: sx, y: sy, hidden };
  }

  /** Latitude/longitude under a screen point, if it hits the globe. */
  raySphere(px: number, py: number) {
    const fovy = this.fovy();
    const aspect = this.width / this.height;
    const nx = (px / this.width) * 2 - 1;
    const ny = 1 - (py / this.height) * 2;
    const t = Math.tan(fovy / 2);
    const e = this.eye;
    // Camera basis.
    const fz = [-e[0], -e[1], -e[2]];
    const fl = Math.hypot(fz[0], fz[1], fz[2]);
    const f = [fz[0] / fl, fz[1] / fl, fz[2] / fl];
    const up = [0, 0, 1];
    let r = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]];
    const rl = Math.hypot(r[0], r[1], r[2]);
    r = [r[0] / rl, r[1] / rl, r[2] / rl];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const d = [
      f[0] + r[0] * nx * t * aspect + u[0] * ny * t,
      f[1] + r[1] * nx * t * aspect + u[1] * ny * t,
      f[2] + r[2] * nx * t * aspect + u[2] * ny * t
    ];
    const dl = Math.hypot(d[0], d[1], d[2]);
    const dir = [d[0] / dl, d[1] / dl, d[2] / dl];
    const b = e[0] * dir[0] + e[1] * dir[1] + e[2] * dir[2];
    const c = e[0] * e[0] + e[1] * e[1] + e[2] * e[2] - 1;
    const disc = b * b - c;
    if (disc < 0) return null;
    const s = -b - Math.sqrt(disc);
    const p = [e[0] + dir[0] * s, e[1] + dir[1] * s, e[2] + dir[2] * s];
    return {
      lat: Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG,
      lon: Math.atan2(p[1], p[0]) / DEG
    };
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                             */
  /* ---------------------------------------------------------------- */

  private fovy() {
    return 26 * DEG;
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const animating = this.updateCamera(dt);
    const live = !this.opts.reducedMotion || this.opts.clock.warping;
    if (live || animating || this.needsFrame || this.dragging) {
      this.render();
      this.needsFrame = false;
    }
    if (now - this.lastTick > 100) {
      this.lastTick = now;
      this.opts.onTick?.(this.opts.clock.now());
    }
    if (!live && !animating && !this.dragging && !this.needsFrame) {
      // Nothing moves with reduced motion; sleep until something changes.
      this.running = false;
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Returns true while the camera is still moving. */
  private updateCamera(dt: number) {
    if (this.dragging) return true;
    const reduced = this.opts.reducedMotion;
    if (this.target) {
      const k = reduced ? 1 : 1 - Math.exp(-dt / 0.45);
      this.yaw += (this.target.yaw - this.yaw) * k;
      this.pitch += (this.target.pitch - this.pitch) * k;
      this.dist += (this.target.dist - this.dist) * k;
      this.yawVel = 0;
      return (
        Math.abs(this.target.yaw - this.yaw) > 0.01 ||
        Math.abs(this.target.pitch - this.pitch) > 0.01 ||
        Math.abs(this.target.dist - this.dist) > 0.001
      );
    }
    const spin = reduced ? 0 : -this.opts.spin;
    // Inertia from a fling, easing back to the slow spin.
    this.yawVel += (spin - this.yawVel) * (1 - Math.exp(-dt / 0.9));
    this.yaw += this.yawVel * dt;
    const pk = 1 - Math.exp(-dt / 1.6);
    this.pitch += (this.homePitch - this.pitch) * (reduced ? 0 : pk);
    this.dist += (this.opts.distance - this.dist) * pk;
    return Math.abs(this.yawVel - spin) > 0.05 || (!reduced && Math.abs(this.homePitch - this.pitch) > 0.02);
  }

  render() {
    const gl = this.gl;
    const { sats, clock } = this.opts;
    const simT = clock.now();
    const theta = gmst(simT);
    const sun = sunDirectionEcef(simT);

    const yaw = this.yaw * DEG;
    const pitch = this.pitch * DEG;
    const eye: Vec3 = [
      this.dist * Math.cos(pitch) * Math.cos(yaw),
      this.dist * Math.cos(pitch) * Math.sin(yaw),
      this.dist * Math.sin(pitch)
    ];
    this.eye = eye;
    const proj = perspective(this.fovy(), this.width / this.height, 0.05, 30);
    const view = lookAt(eye, [0, 0, 0], [0, 0, 1]);
    this.mvp = multiply(proj, view);

    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Earth.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    const sp = this.programs.sphere;
    gl.useProgram(sp.program);
    gl.uniformMatrix4fv(sp.uniforms.uMVP, false, this.mvp);
    gl.uniform3fv(sp.uniforms.uSun, sun);
    gl.uniform3fv(sp.uniforms.uEye, eye);
    this.bindAttrib(sp.attribs.aPos, this.buffers.spherePos, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.sphereIdx);
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, this.sphereCount, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(false);

    // Graticule.
    this.drawLines(this.buffers.grat, this.gratCount, [0.62, 0.71, 0.82, 0.07], gl.LINES, null);

    // Land dots.
    const dp = this.programs.dots;
    gl.useProgram(dp.program);
    gl.uniformMatrix4fv(dp.uniforms.uMVP, false, this.mvp);
    gl.uniform3fv(dp.uniforms.uEye, eye);
    gl.uniform3fv(dp.uniforms.uSun, sun);
    const screenR = this.screenRadius();
    gl.uniform1f(dp.uniforms.uSize, Math.max(1.3 * this.dpr, Math.min(3.2 * this.dpr, screenR * 0.0068)));
    gl.uniform3f(dp.uniforms.uDay, 0.66, 0.74, 0.85);
    gl.uniform3f(dp.uniforms.uNight, 0.2, 0.26, 0.34);
    this.bindAttrib(dp.attribs.aPos, this.buffers.dots, 3);
    gl.drawArrays(gl.POINTS, 0, this.dotCount);

    // Atmosphere rim.
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE);
    const hp = this.programs.halo;
    gl.useProgram(hp.program);
    gl.uniform2f(hp.uniforms.uCenter, this.width / 2, this.height / 2);
    gl.uniform1f(hp.uniforms.uRadius, screenR);
    const sv = transformDir(view, sun);
    gl.uniform3f(hp.uniforms.uSunView, sv[0], sv[1], sv[2]);
    this.bindAttrib(hp.attribs.aPos, this.buffers.quad, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);

    // Satellites, in ECEF, Earth radius = 1.
    const scale = 1 / R_EQUATOR;
    for (let i = 0; i < sats.length; i++) {
      const p = eciToEcef(eciPosition(sats[i], simT), theta);
      this.satEcef[i * 3] = p[0] * scale;
      this.satEcef[i * 3 + 1] = p[1] * scale;
      this.satEcef[i * 3 + 2] = p[2] * scale;
    }

    // Orbit rings, one per plane, front and back.
    const planes = new Map<string, number>();
    sats.forEach((s, i) => {
      if (!planes.has(s.plane)) planes.set(s.plane, i);
    });
    const selPlane = this.selected >= 0 ? sats[this.selected].plane : null;
    for (const [plane, i] of planes) {
      const ring = orbitRing(sats[i], simT, 160).map((p) => eciToEcef(p, theta));
      const arr = new Float32Array(ring.length * 3);
      ring.forEach((p, k) => {
        arr[k * 3] = p[0] * scale;
        arr[k * 3 + 1] = p[1] * scale;
        arr[k * 3 + 2] = p[2] * scale;
      });
      const strong = plane === selPlane;
      this.drawDynamicLines(arr, null, null, [0.85, 0.9, 1, strong ? 0.34 : 0.13], gl.LINE_STRIP, false, true);
    }

    // Ground track of the selected satellite.
    if (this.selected >= 0) {
      const sat = sats[this.selected];
      const step = 30_000;
      const past = groundTrack(sat, simT - this.trackWindow.past * 60_000, simT, step);
      const r = 1.003;
      const pArr = new Float32Array(past.length * 3);
      const pAlpha = new Float32Array(past.length);
      past.forEach((p, k) => {
        pArr[k * 3] = p[0] * r;
        pArr[k * 3 + 1] = p[1] * r;
        pArr[k * 3 + 2] = p[2] * r;
        pAlpha[k] = Math.pow(k / Math.max(1, past.length - 1), 1.4);
      });
      const accent = this.emphasizeTrack;
      this.drawDynamicLines(
        pArr,
        pAlpha,
        null,
        accent ? [1, 0.71, 0.28, 0.95] : [0.93, 0.95, 0.98, 0.75],
        gl.LINE_STRIP,
        false,
        false
      );
      if (this.showFutureTrack) {
        const fut = groundTrack(sat, simT, simT + this.trackWindow.future * 60_000, step);
        const fArr = new Float32Array(fut.length * 3);
        const fAlpha = new Float32Array(fut.length);
        const fDash = new Float32Array(fut.length);
        fut.forEach((p, k) => {
          fArr[k * 3] = p[0] * r;
          fArr[k * 3 + 1] = p[1] * r;
          fArr[k * 3 + 2] = p[2] * r;
          fAlpha[k] = 1 - k / fut.length;
          fDash[k] = k * 0.5;
        });
        this.drawDynamicLines(fArr, fAlpha, fDash, [0.93, 0.95, 0.98, 0.5], gl.LINE_STRIP, true, false);
      }
      // Line from the satellite down to the ground.
      const s = [this.satEcef[this.selected * 3], this.satEcef[this.selected * 3 + 1], this.satEcef[this.selected * 3 + 2]];
      const sl = Math.hypot(s[0], s[1], s[2]);
      const nadir = new Float32Array([s[0], s[1], s[2], (s[0] / sl) * r, (s[1] / sl) * r, (s[2] / sl) * r]);
      this.drawDynamicLines(nadir, null, null, [1, 0.71, 0.28, 0.55], gl.LINES, false, false);
    }

    // Tasking target.
    if (this.site) {
      const ring = groundRing(this.site.lat, this.site.lon, this.site.radiusKm);
      this.drawDynamicLines(ring, null, null, [1, 0.71, 0.28, 0.85], gl.LINES, false, false);
      const u = unitFromLatLon(this.site.lat, this.site.lon);
      this.drawSprites(new Float32Array([u[0] * 1.003, u[1] * 1.003, u[2] * 1.003]), 1, 30 * this.dpr, [1, 0.71, 0.28, 1], 2);
    }

    // Satellites: hidden ones dim, visible ones bright.
    gl.depthFunc(gl.GREATER);
    this.drawSprites(this.satEcef, sats.length, 4 * this.dpr, [0.85, 0.9, 1, 0.2], 0);
    gl.depthFunc(gl.LEQUAL);
    this.drawSprites(this.satEcef, sats.length, 5 * this.dpr, [0.95, 0.97, 1, 1], 0);
    if (this.selected >= 0) {
      const one = this.satEcef.subarray(this.selected * 3, this.selected * 3 + 3);
      gl.disable(gl.DEPTH_TEST);
      this.drawSprites(one, 1, 7 * this.dpr, [1, 0.71, 0.28, 1], 0);
      this.drawSprites(one, 1, 30 * this.dpr, [1, 0.71, 0.28, 0.95], 1);
      gl.enable(gl.DEPTH_TEST);
    }
    gl.depthMask(true);
  }

  private screenRadius() {
    const f = 1 / Math.tan(this.fovy() / 2);
    return (this.height / 2) * f * (1 / Math.sqrt(this.dist * this.dist - 1));
  }

  private bindAttrib(loc: number, buffer: WebGLBuffer, size: number) {
    const gl = this.gl;
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  private drawLines(
    buffer: WebGLBuffer,
    count: number,
    color: [number, number, number, number],
    mode: number,
    alpha: WebGLBuffer | null
  ) {
    const gl = this.gl;
    const lp = this.programs.lines;
    gl.useProgram(lp.program);
    gl.uniformMatrix4fv(lp.uniforms.uMVP, false, this.mvp);
    gl.uniform4fv(lp.uniforms.uColor, color);
    gl.uniform1f(lp.uniforms.uDashed, 0);
    this.bindAttrib(lp.attribs.aPos, buffer, 3);
    this.bindAttrib(lp.attribs.aAlpha, alpha ?? this.buffers.ones, 1);
    this.bindAttrib(lp.attribs.aDash, this.buffers.zeros, 1);
    gl.drawArrays(mode, 0, Math.min(count, 1e7));
  }

  private drawDynamicLines(
    pos: Float32Array,
    alpha: Float32Array | null,
    dash: Float32Array | null,
    color: [number, number, number, number],
    mode: number,
    dashed: boolean,
    withBackPass: boolean
  ) {
    const gl = this.gl;
    const lp = this.programs.lines;
    const n = pos.length / 3;
    gl.useProgram(lp.program);
    gl.uniformMatrix4fv(lp.uniforms.uMVP, false, this.mvp);
    gl.uniform1f(lp.uniforms.uDashed, dashed ? 1 : 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dyn);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    gl.enableVertexAttribArray(lp.attribs.aPos);
    gl.vertexAttribPointer(lp.attribs.aPos, 3, gl.FLOAT, false, 0, 0);
    if (alpha) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dynAlpha);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, alpha);
      gl.enableVertexAttribArray(lp.attribs.aAlpha);
      gl.vertexAttribPointer(lp.attribs.aAlpha, 1, gl.FLOAT, false, 0, 0);
    } else this.bindAttrib(lp.attribs.aAlpha, this.buffers.ones, 1);
    if (dash) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dynDash);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dash);
      gl.enableVertexAttribArray(lp.attribs.aDash);
      gl.vertexAttribPointer(lp.attribs.aDash, 1, gl.FLOAT, false, 0, 0);
    } else this.bindAttrib(lp.attribs.aDash, this.buffers.zeros, 1);
    gl.uniform4fv(lp.uniforms.uColor, color);
    gl.depthFunc(gl.LEQUAL);
    gl.drawArrays(mode, 0, n);
    if (withBackPass) {
      gl.depthFunc(gl.GREATER);
      gl.uniform4fv(lp.uniforms.uColor, [color[0], color[1], color[2], color[3] * 0.28]);
      gl.drawArrays(mode, 0, n);
      gl.depthFunc(gl.LEQUAL);
    }
  }

  private drawSprites(
    pos: Float32Array,
    count: number,
    size: number,
    color: [number, number, number, number],
    shape: number
  ) {
    const gl = this.gl;
    const pp = this.programs.points;
    gl.useProgram(pp.program);
    gl.uniformMatrix4fv(pp.uniforms.uMVP, false, this.mvp);
    gl.uniform1f(pp.uniforms.uSize, size);
    gl.uniform4fv(pp.uniforms.uColor, color);
    gl.uniform1f(pp.uniforms.uShape, shape);
    gl.uniform1f(pp.uniforms.uLine, (1.0 * this.dpr) / size);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dyn);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos.subarray(0, count * 3));
    gl.enableVertexAttribArray(pp.attribs.aPos);
    gl.vertexAttribPointer(pp.attribs.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, count);
  }
}

function transformDir(m: Mat4, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2]
  ];
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl');
  } catch {
    return false;
  }
}

/**
 * The six generated captures. Each scene draws one place before or after a
 * change, deterministically from the site's seed. Coordinates are in a
 * 1536 × 1024 frame; north is up and the sun is in the south-east, so
 * shadows fall to the north-west.
 */
import type { SiteKind } from '~/content/sites';
import type { Painter, Pt, Refl } from './paint';
import {
  BASE_H,
  BASE_W,
  M,
  Noise,
  coarseField,
  distToPolyline,
  meander,
  mixRefl,
  mulberry32,
  scaleRefl,
  smoothstep,
  wobblyRing
} from './paint';

export type Phase = 'before' | 'after';
type Scene = (p: Painter, phase: Phase, seed: number) => void;

const SHADOW: [number, number] = [-0.62, -0.5];

const pick = <T,>(rnd: () => number, list: readonly T[]) => list[Math.floor(rnd() * list.length)];

/* -------------------------------------------------------------------------- */
/* River delta after a flood                                                   */
/* -------------------------------------------------------------------------- */

const delta: Scene = (p, phase, seed) => {
  const n = new Noise(seed);
  const rnd = mulberry32(seed);
  const after = phase === 'after';

  p.fill(M.soil);

  // Rice paddies on a tilted grid, separated by earth bunds.
  const rot = 0.33;
  p.rotated(BASE_W / 2, BASE_H / 2, rot, () => {
    const cw = 64;
    const ch = 40;
    for (let y = -900; y < 900; y += ch) {
      let x = -1100;
      while (x < 1100) {
        const w = cw * (0.7 + rnd() * 0.9);
        const stage = n.fbm(x * 0.002 + 3, y * 0.002, 2) + (rnd() - 0.5) * 0.5;
        let mat: Refl;
        if (stage > 0.32) mat = M.paddyWet;
        else if (stage > -0.05) mat = mixRefl(M.vegStressed, M.veg, 0.55 + rnd() * 0.45);
        else if (stage > -0.3) mat = mixRefl(M.grassDry, M.veg, rnd() * 0.5);
        else mat = mixRefl(M.soil, M.soilLight, rnd());
        p.rect(x + 1.5, y + 1.5, w - 3, ch - 3, mat);
        x += w;
      }
    }
    // Shrimp and fish ponds in clusters.
    for (let k = 0; k < 6; k++) {
      const ox = -700 + rnd() * 1400;
      const oy = -600 + rnd() * 1200;
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 2; b++) {
          p.rect(ox + a * 46, oy + b * 34, 40, 28, mixRefl(M.water, M.siltWater, rnd() * 0.6));
        }
      }
    }
    // Canals along the grid, lined with trees.
    for (let y = -900; y < 900; y += ch * 6) {
      p.line([[-1100, y], [1100, y]], 5, M.siltWater);
      for (let x = -1100; x < 1100; x += 7 + rnd() * 6) {
        if (rnd() < 0.7) p.circle(x, y - 6, 3 + rnd() * 3, mixRefl(M.forest, M.veg, rnd() * 0.5));
        if (rnd() < 0.7) p.circle(x, y + 6, 3 + rnd() * 3, mixRefl(M.forest, M.veg, rnd() * 0.5));
      }
    }
  });

  const river = meander([-80, 250], [BASE_W + 80, 700], n, 120, 26, 1.3);
  const branch = meander(river[12], [BASE_W + 60, 1080], n, 70, 16, 4.2);

  if (after) {
    // Floodwater fills everything low; natural levees beside the channels
    // and the village mounds stay dry.
    const elev = coarseField((x, y) => {
      const d = Math.min(distToPolyline(x, y, river) - 60, distToPolyline(x, y, branch) - 32);
      const levee = Math.exp(-Math.pow((d - 55) / 40, 2)) * 0.55;
      return n.fbm(x * 0.0035 + 11, y * 0.0035, 4) + levee;
    }, 4);
    const silt = coarseField((x, y) => n.fbm(x * 0.006, y * 0.006 + 7, 3), 6);
    p.pixels((x, y) => {
      const e = elev(x, y);
      const a = 1 - smoothstep(0.1, 0.2, e);
      if (a <= 0) return null;
      return { r: mixRefl(M.flood, M.siltWater, smoothstep(-0.4, 0.5, silt(x, y))), a: a * 0.96 };
    });
  }

  const widen = after ? 1.45 : 1;
  p.line(river, 118 * widen, M.siltWater, 1, true);
  p.line(branch, 62 * widen, M.siltWater, 1, true);
  // Sandbars in the main channel (drowned after the flood).
  if (!after) {
    for (const i of [6, 15, 21]) {
      const [x, y] = river[i];
      p.ellipse(x + 10, y + 8, 46, 12, 0.3, M.sand, 0.85);
    }
  }

  // Levee roads with villages and tree cover.
  for (const off of [-96, 96]) {
    const road = river.map(([x, y], i) => {
      const [x2, y2] = river[Math.min(river.length - 1, i + 1)];
      const [x1, y1] = river[Math.max(0, i - 1)];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l = Math.hypot(dx, dy) || 1;
      return [x - (dy / l) * off * widen, y + (dx / l) * off * widen] as Pt;
    });
    for (let i = 0; i < road.length; i++) {
      const [x, y] = road[i];
      for (let k = 0; k < 14; k++) {
        p.circle(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 34, 4 + rnd() * 5, mixRefl(M.forest, M.veg, rnd() * 0.4));
      }
    }
    p.line(road, 6, M.soilLight, 1, true);
    for (let i = 1; i < road.length - 1; i++) {
      if (rnd() < 0.45) continue;
      const [x, y] = road[i];
      for (let k = 0; k < 9; k++) {
        const bx = x + (rnd() - 0.5) * 80;
        const by = y + (rnd() - 0.5) * 26;
        const w = 9 + rnd() * 8;
        const h = 6 + rnd() * 5;
        p.shadowRect(bx, by, w, h, 0.33, SHADOW[0] * 4, SHADOW[1] * 4, 0.35);
        p.rotRect(bx, by, w, h, 0.33, pick(rnd, [M.roofTerracotta, M.roofGray, M.roofLight, M.roofTan]));
      }
    }
  }

  p.grain(n, 0.07);
};

/* -------------------------------------------------------------------------- */
/* Vineyards in late summer                                                     */
/* -------------------------------------------------------------------------- */

const vineyard: Scene = (p, phase, seed) => {
  const n = new Noise(seed);
  const rnd = mulberry32(seed);
  const after = phase === 'after';
  const grass = after ? M.grassDry : mixRefl(M.grass, M.grassDry, 0.25);
  p.fill(grass);

  // Woods on the hilltop, top-left.
  const woods = wobblyRing(160, 70, 560, 260, n, 0.3, 60, -0.35, 2);
  p.blob(woods, M.forest);
  for (let k = 0; k < 1800; k++) {
    const x = rnd() * 760 - 120;
    const y = rnd() * 380 - 120;
    if (y > 260 - x * 0.35) continue;
    p.circle(x, y, 3 + rnd() * 6, scaleRefl(M.forest, 0.7 + rnd() * 0.6), 0.9);
  }

  // Long strip parcels running down the slope.
  const rot = -0.42;
  // One block on the slope is short of water by late August.
  const stressX = 980;
  const stressY = 470;
  p.rotated(BASE_W / 2, BASE_H / 2, rot, () => {
    for (let u = -980; u < 980; ) {
      const len = 190 + rnd() * 170;
      for (let v = -760; v < 900; ) {
        const w = 26 + rnd() * 60;
        const cx = u + len / 2;
        const cy = v + w / 2;
        // Rotate back to the image frame to keep the woods clear.
        const ix = BASE_W / 2 + cx * Math.cos(rot) - cy * Math.sin(rot);
        const iy = BASE_H / 2 + cx * Math.sin(rot) + cy * Math.cos(rot);
        const inWoods = iy < 300 - ix * 0.35;
        const kindRoll = rnd();
        if (!inWoods && ix > -60 && ix < BASE_W + 60 && iy > -60 && iy < BASE_H + 60) {
          if (kindRoll < 0.08) {
            p.rect(u + 2, v + 2, len - 4, w - 4, after ? M.grassDry : M.grass);
          } else if (kindRoll < 0.12) {
            p.rect(u + 2, v + 2, len - 4, w - 4, M.soil);
          } else {
            p.rect(u + 2, v + 2, len - 4, w - 4, scaleRefl(M.soilLight, 1.12));
            const isStressed = Math.hypot(ix - stressX, iy - stressY) < 120;
            let vigor = 0.74 + n.fbm(ix * 0.004, iy * 0.004, 2) * 0.32 + (rnd() - 0.5) * 0.12;
            if (after) vigor -= 0.1;
            if (after && isStressed) vigor = 0.08 + rnd() * 0.08;
            for (let r = v + 4; r < v + w - 3; r += 5) {
              const rowVigor = Math.max(0, Math.min(1, vigor + (rnd() - 0.5) * 0.08));
              const canopy = scaleRefl(mixRefl(M.vegStressed, M.veg, rowVigor), 0.82);
              p.line([[u + 4, r], [u + len - 4, r]], 2.8, after ? mixRefl(canopy, M.grassDry, 0.1) : canopy);
            }
          }
          // Dry-stone walls round some parcels.
          if (rnd() < 0.2) p.line([[u + 1, v + 1], [u + len - 1, v + 1]], 1.4, M.benchLight, 0.8);
        }
        v += w;
      }
      // Farm track between parcel bands.
      p.line([[u, -760], [u, 900]], 5, M.soilLight);
      u += len;
    }
  });

  // The main road and a village at the foot of the slope.
  const road: Pt[] = [
    [-40, 980],
    [400, 900],
    [900, 860],
    [1600, 760]
  ];
  for (let k = 0; k < 220; k++) {
    const t = k / 220;
    const i = Math.min(2, Math.floor(t * 3));
    const f = t * 3 - i;
    const x = road[i][0] + (road[i + 1][0] - road[i][0]) * f;
    const y = road[i][1] + (road[i + 1][1] - road[i][1]) * f;
    p.circle(x, y - 12, 5 + rnd() * 3, M.forest);
  }
  p.line(road, 10, M.asphalt, 1, true);
  for (let k = 0; k < 120; k++) {
    const x = 1080 + rnd() * 520;
    const y = 840 + rnd() * 220 - (x - 1080) * 0.2;
    if (y < 790 - (x - 1080) * 0.14) continue;
    const w = 12 + rnd() * 16;
    const h = 8 + rnd() * 10;
    const r = -0.2 + (rnd() - 0.5) * 0.3;
    p.shadowRect(x, y, w, h, r, SHADOW[0] * 7, SHADOW[1] * 7, 0.4);
    p.rotRect(x, y, w, h, r, pick(rnd, [M.roofTerracotta, M.roofTerracotta, M.roofGray, M.roofTan]));
  }
  p.grain(n, 0.06);
};

/* -------------------------------------------------------------------------- */
/* Container port                                                              */
/* -------------------------------------------------------------------------- */

const port: Scene = (p, phase, seed) => {
  const n = new Noise(seed);
  const rnd = mulberry32(seed);
  const after = phase === 'after';
  const quayX = 470;
  const newBerthY = 700;

  p.fill(M.deepWater);
  // Gentle water texture.
  const wave = coarseField((x, y) => n.fbm(x * 0.01, y * 0.02, 3), 4);
  p.pixels((x, y) => (x < quayX ? { r: scaleRefl(M.deepWater, 1 + wave(x, y) * 0.25), a: 1 } : null));

  // Terminal land.
  p.rect(quayX, 0, BASE_W - quayX, after ? BASE_H : newBerthY, M.asphalt);
  if (!after) {
    // New berth still being reclaimed: sand fill and a work basin.
    p.poly(
      [
        [quayX + 260, newBerthY],
        [BASE_W, newBerthY],
        [BASE_W, BASE_H],
        [quayX + 120, BASE_H],
        [quayX + 180, 860]
      ],
      M.sand
    );
    p.rect(quayX, newBerthY, 300, BASE_H - newBerthY, M.siltWater);
    p.line([[quayX + 60, 980], [quayX + 220, 860], [quayX + 330, 800]], 4, M.rail);
    p.rotRect(quayX + 50, 990, 90, 26, -0.6, M.hullRed);
    for (let k = 0; k < 40; k++) {
      p.circle(quayX + 300 + rnd() * 700, newBerthY + 40 + rnd() * 280, 3 + rnd() * 9, M.soilLight, 0.6);
    }
  }
  // Quay edge.
  p.rect(quayX - 6, 0, 10, after ? BASE_H : newBerthY, M.concrete);

  // Container yard: blocks of stacks with lanes between.
  const boxes = [M.boxRed, M.boxBlue, M.boxWhite, M.boxOrange, M.boxGreen, M.boxGray, M.boxBlue, M.boxWhite];
  const yardBottom = after ? 980 : newBerthY - 30;
  for (let y = 70; y < yardBottom; y += 36) {
    for (let x = 640; x < 1360; x += 170) {
      const fill = after || y < newBerthY ? 0.86 : 0;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 10; col++) {
          if (rnd() > fill) continue;
          const bx = x + col * 15.6;
          const by = y + row * 3.6;
          p.rect(bx, by, 15, 3.1, scaleRefl(pick(rnd, boxes), 0.85 + rnd() * 0.3));
        }
      }
      p.rect(x, y + 26, 156, 2, M.roofDark, 0.5);
    }
  }
  // Painted lane markings and the gate road.
  for (let y = 60; y < yardBottom; y += 36) p.line([[600, y], [1380, y]], 0.8, M.roofLight, 0.35);
  p.line([[1440, -20], [1440, BASE_H + 20]], 22, M.asphalt);
  p.line([[1440, -20], [1440, BASE_H + 20]], 1, M.roofLight, 0.6);
  for (let k = 0; k < 18; k++) {
    const ty = rnd() * BASE_H;
    p.rect(1432 + (k % 2) * 10, ty, 5, 18, pick(rnd, boxes));
  }
  // Rail sidings.
  for (let k = 0; k < 4; k++) p.line([[1478 + k * 12, -20], [1478 + k * 12, BASE_H + 20]], 2, M.rail);
  for (let k = 0; k < 9; k++) {
    const ty = 40 + k * 90 + rnd() * 30;
    for (let c = 0; c < 4; c++) p.rect(1474 + (k % 4) * 12, ty + c * 17, 7, 15, pick(rnd, boxes));
  }

  // Ships alongside, with deck cargo and the bridge aft.
  const berths = after ? [80, 470, 760] : [80, 470];
  for (const by of berths) {
    const len = 330 + rnd() * 60;
    const beam = 50;
    const x0 = quayX - 12 - beam;
    const hull: Pt[] = [
      [x0, by],
      [x0 + beam, by],
      [x0 + beam, by + len - 40],
      [x0 + beam / 2, by + len],
      [x0, by + len - 40]
    ];
    p.poly(hull.map(([x, y]) => [x + SHADOW[0] * 10, y + SHADOW[1] * 10] as Pt), M.deepWater, 0.0);
    p.poly(hull, pick(rnd, [M.hull, M.hullRed, M.hull]));
    for (let bay = 0; bay < Math.floor((len - 110) / 17); bay++) {
      for (let cell = 0; cell < 8; cell++) {
        if (rnd() < 0.12) continue;
        p.rect(x0 + 4 + cell * 5.4, by + 70 + bay * 17, 4.8, 15.2, pick(rnd, boxes));
      }
    }
    p.shadowRect(x0 + beam / 2, by + 34, beam - 8, 22, 0, SHADOW[0] * 16, SHADOW[1] * 16, 0.45);
    p.rect(x0 + 4, by + 22, beam - 8, 22, M.roofWhite);
  }

  // Ship-to-shore cranes, booms reaching over the water.
  const craneCount = after ? 12 : 8;
  for (let k = 0; k < craneCount; k++) {
    const cy = 60 + k * 80 + rnd() * 10;
    p.shadowRect(quayX - 30, cy, 120, 6, 0, SHADOW[0] * 40, SHADOW[1] * 40, 0.35);
    p.rect(quayX - 92, cy - 3, 150, 6, M.boxBlue);
    p.rect(quayX + 10, cy - 12, 26, 24, M.roofLight);
  }

  // A tug and its wake.
  const tx = 230;
  const ty = after ? 640 : 380;
  p.line([[tx, ty], [tx - 30, ty + 160]], 6, M.roofWhite, 0.25);
  p.line([[tx, ty], [tx + 30, ty + 160]], 6, M.roofWhite, 0.25);
  p.ellipse(tx, ty, 8, 20, 0, M.hullRed);
  p.grain(n, 0.05);
};

/* -------------------------------------------------------------------------- */
/* Wildfire burn scar                                                          */
/* -------------------------------------------------------------------------- */

const burn: Scene = (p, phase, seed) => {
  const n = new Noise(seed);
  const n2 = new Noise(seed + 101);
  const rnd = mulberry32(seed);
  const after = phase === 'after';

  const height = coarseField(
    (x, y) => n.fbm(x * 0.0011 + 2, y * 0.0011 + 5, 5) * 0.8 + n.ridge(x * 0.0024, y * 0.0024, 3) * 0.35,
    4
  );
  const shade = coarseField((x, y) => {
    const e = 8;
    const dx = (height(x + e, y) - height(x - e, y)) * 40;
    const dy = (height(x, y + e) - height(x, y - e)) * 40;
    // Surface normal against light from the south-east, high in the sky.
    const l = (-dx * 0.5 - dy * 0.5 + 0.72) / Math.sqrt(dx * dx + dy * dy + 1);
    return Math.max(0.55, Math.min(1.3, 0.35 + l * 0.9));
  }, 4);
  const cover = coarseField((x, y) => n2.fbm(x * 0.0045, y * 0.0045, 4), 4);

  const road = meander([-40, 860], [BASE_W + 40, 620], n, 90, 30, 3.3);
  const lakeCx = 120;
  const lakeCy = 1040;

  const burnMask = coarseField((x, y) => {
    const dx = (x - 860) / 760;
    const dy = (y - 400) / 520;
    const warp = n2.fbm(x * 0.0022 + 9, y * 0.0022 - 3, 5) * 0.6;
    return 1 - Math.hypot(dx, dy) + warp;
  }, 3);
  const islands = coarseField((x, y) => n.fbm(x * 0.009 + 40, y * 0.009, 4), 3);
  const roadDist = coarseField((x, y) => distToPolyline(x, y, road), 6);

  p.pixels((x, y) => {
    const h = height(x, y);
    const s = shade(x, y);
    const c = cover(x, y);
    // Individual crowns: dark tree tops over lighter ground.
    const crown = n.value(x * 0.38, y * 0.38) + n.value(x * 0.8 + 3, y * 0.8) * 0.4;
    const crownT = smoothstep(-0.1, 0.5, crown);
    const valley = smoothstep(0.02, -0.16, h);
    const density = smoothstep(-0.42, 0.05, c) * (1 - valley);
    const ground = mixRefl(M.grassDry, M.grass, smoothstep(-0.6, 0.3, c) * 0.5);
    const trees = mixRefl(scaleRefl(M.forest, 1.35), scaleRefl(M.forest, 0.62), crownT);
    let r = mixRefl(ground, trees, density * (0.55 + crownT * 0.45));
    if (after) {
      const m = burnMask(x, y);
      const unburned = islands(x, y) > 0.36 || roadDist(x, y) < 30;
      if (m > 0 && !unburned) {
        const sev = smoothstep(0, 0.45, m + n2.value(x * 0.02, y * 0.02) * 0.18);
        // Low severity browns the needles; high severity leaves char and ash.
        const scorchedTrees = mixRefl(scaleRefl(M.burnMod, 1.15), scaleRefl(M.burnHigh, 0.8), crownT);
        let burnt = mixRefl(scorchedTrees, M.burnHigh, smoothstep(0.35, 0.85, sev));
        const ash = smoothstep(0.45, 0.75, n.value(x * 0.55 + 11, y * 0.55)) * smoothstep(0.55, 0.95, sev);
        burnt = mixRefl(burnt, M.ash, ash * 0.8);
        const edge = smoothstep(0, 0.08, m);
        r = mixRefl(r, burnt, edge * (0.5 + density * 0.5));
      }
    }
    return { r: scaleRefl(r, s), a: 1 };
  });

  // Lake in the valley corner.
  p.blob(wobblyRing(lakeCx, lakeCy, 380, 240, n, 0.25, 40, 0.2, 6), M.water, 0.5);
  p.blob(wobblyRing(lakeCx, lakeCy, 370, 230, n, 0.25, 40, 0.2, 6), M.deepWater);

  p.line(road, 9, M.asphalt, 1, true);
  // A ranch and outbuildings by the road.
  for (let k = 0; k < 7; k++) {
    const [x, y] = road[8 + k];
    const w = 16 + rnd() * 18;
    p.shadowRect(x + 26, y - 30, w, 12, 0.1, SHADOW[0] * 6, SHADOW[1] * 6, 0.4);
    p.rotRect(x + 26, y - 30, w, 12, 0.1, pick(rnd, [M.roofLight, M.roofGray, M.roofTerracotta]));
  }
  p.grain(n, 0.045);
};

/* -------------------------------------------------------------------------- */
/* Open-pit mine                                                               */
/* -------------------------------------------------------------------------- */

const mine: Scene = (p, phase, seed) => {
  const n = new Noise(seed);
  const rnd = mulberry32(seed);
  const after = phase === 'after';
  const cx = 700;
  const cy = 520;
  const rx = after ? 460 : 400;
  const ry = rx * 0.78;
  const benches = after ? 11 : 9;

  const height = coarseField((x, y) => n.fbm(x * 0.0022, y * 0.0022, 5), 4);
  const shade = coarseField((x, y) => {
    const e = 6;
    const dx = height(x + e, y) - height(x - e, y);
    const dy = height(x, y + e) - height(x, y - e);
    return Math.max(0.72, Math.min(1.22, 1 - (dx + dy) * 9));
  }, 4);
  const washes = coarseField((x, y) => n.ridge(x * 0.004 + 3, y * 0.004 - 8, 3), 3);

  p.pixels((x, y) => {
    const tone = n.fbm(x * 0.004 + 20, y * 0.004, 3);
    let r = mixRefl(M.desert, M.desertDark, smoothstep(-0.3, 0.6, tone) * 0.6);
    const w = washes(x, y);
    if (w > 0.62) r = mixRefl(r, M.desertDark, smoothstep(0.62, 0.72, w) * 0.7);
    r = scaleRefl(r, shade(x, y));

    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const ang = Math.atan2(dy, dx);
    const warp =
      1 + n.fbm(Math.cos(ang) * 1.4 + 5, Math.sin(ang) * 1.4 + 5, 3) * 0.2 + n.fbm(x * 0.004, y * 0.004, 2) * 0.05;
    const rho = Math.hypot(dx, dy) / warp;
    if (rho < 1) {
      const depth = (1 - rho) * benches + n.fbm(x * 0.008, y * 0.008, 2) * 0.35;
      const b = Math.floor(depth);
      const f = depth - b;
      // Bench walls face the pit centre; light comes from the north-west.
      const nx = -dx / (rho || 1);
      const ny = -dy / (rho || 1);
      const lit = 0.75 + (nx * -0.7 + ny * -0.7) * 0.35;
      const wall = f < 0.38;
      let pit = wall
        ? scaleRefl(mixRefl(M.rock, M.benchLight, 0.45), lit)
        : scaleRefl(M.benchLight, 0.92 + (b % 2) * 0.06);
      pit = mixRefl(pit, M.desertDark, n.value(x * 0.03, y * 0.03) * 0.15 + 0.1);
      pit = mixRefl(pit, M.oxide, smoothstep(0.1, 0.6, n.fbm(x * 0.006 + 3, y * 0.006, 3)) * 0.55);
      if (rho < 0.09) pit = mixRefl(M.pond, M.water, smoothstep(0.09, 0.03, rho) * 0.3);
      r = pit;
    }
    return { r, a: 1 };
  });

  // Haul road spiralling down the benches.
  const spiral: Pt[] = [];
  for (let k = 0; k <= 160; k++) {
    const t = k / 160;
    const a = 3.6 + t * Math.PI * 3.2;
    const rr = 1.02 - t * 0.86;
    spiral.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]);
  }
  p.line(spiral, 8, M.soilLight, 0.9);

  // Waste dump to the east, stepped edges; it grows across the old road.
  const dumpX = after ? 1290 : 1220;
  const dumpRx = after ? 300 : 220;
  for (let k = 0; k < 4; k++) {
    const ring = wobblyRing(dumpX, 600, dumpRx - k * 30, 260 - k * 30, n, 0.18, 44, 0.3, 3);
    p.blob(ring, k % 2 ? scaleRefl(M.benchLight, 0.92) : scaleRefl(M.rock, 1.15));
  }
  const oldRoad: Pt[] = [
    [1060, 1100],
    [1080, 760],
    [1120, 420],
    [1210, 120],
    [1300, -40]
  ];
  const newRoad: Pt[] = [
    [1060, 1100],
    [1010, 760],
    [990, 420],
    [1210, 120],
    [1300, -40]
  ];
  p.line(after ? newRoad : oldRoad, 11, M.soilLight, 0.95, true);

  // Tailings pond with its dam, north-east.
  const tail = wobblyRing(1220, 120, 360, 170, n, 0.15, 40, -0.15, 9);
  p.blob(tail, M.tailings);
  p.blob(wobblyRing(1250, 100, 250, 100, n, 0.2, 40, -0.15, 12), mixRefl(M.pond, M.tailings, after ? 0.15 : 0.45));
  p.line([[860, 220], [1600, 290]], 8, M.benchLight);

  // Concentrator plant and conveyors by the pit rim.
  for (let k = 0; k < 14; k++) {
    const x = 220 + rnd() * 220;
    const y = 820 + rnd() * 140;
    const w = 20 + rnd() * 50;
    const h = 14 + rnd() * 30;
    p.shadowRect(x, y, w, h, 0, SHADOW[0] * 10, SHADOW[1] * 10, 0.4);
    p.rect(x - w / 2, y - h / 2, w, h, pick(rnd, [M.roofLight, M.roofGray, M.roofWhite]));
  }
  p.line([[330, 860], [cx - rx * 0.55, cy + ry * 0.55]], 3, M.roofLight);
  p.line([[-20, 900], [320, 880], [1060, 1100]], 12, M.soilLight, 0.9, true);
  // Haul trucks on the roads.
  for (let k = 0; k < 9; k++) {
    const pt = spiral[Math.floor(rnd() * spiral.length)];
    p.rect(pt[0] - 3, pt[1] - 2, 7, 4, M.boxOrange);
  }
  p.grain(n, 0.05);
};

/* -------------------------------------------------------------------------- */
/* Coastal city after a storm                                                  */
/* -------------------------------------------------------------------------- */

const city: Scene = (p, phase, seed) => {
  const n = new Noise(seed);
  const rnd = mulberry32(seed);
  const after = phase === 'after';
  const shoreX = (y: number) => 1260 + n.fbm(y * 0.004, 2, 2) * 18;
  const beachW = after ? 70 : 110;

  p.fill(M.grass);
  // Ocean with surf, and the bay to the west.
  const turbid = coarseField((x, y) => n.fbm(x * 0.004 + 4, y * 0.006, 3), 6);
  p.pixels((x, y) => {
    const sx = shoreX(y);
    if (x > sx) {
      const d = x - sx;
      let r = mixRefl(M.water, M.deepWater, smoothstep(0, 220, d));
      if (after) r = mixRefl(r, M.siltWater, smoothstep(260, 0, d) * smoothstep(-0.5, 0.4, turbid(x, y)) * 0.85);
      const foam = Math.max(0, Math.sin(d * 0.21 + n.value(y * 0.02, 1) * 3)) * smoothstep(60, 0, d);
      return { r: mixRefl(r, M.roofWhite, foam * 0.5), a: 1 };
    }
    if (x > sx - beachW) return { r: mixRefl(M.sand, M.soilLight, smoothstep(sx, sx - beachW, x) * 0.25), a: 1 };
    if (x < 190 + n.fbm(y * 0.005, 9, 2) * 30) return { r: mixRefl(M.water, M.siltWater, 0.35), a: 1 };
    return null;
  });

  // Street grid.
  const avenues = [300, 520, 740, 950, 1120];
  const streets: number[] = [];
  for (let y = 30; y < BASE_H; y += 104) streets.push(y);
  const westEdge = 230;
  const eastEdge = 1255 - beachW;
  p.rect(westEdge, 0, eastEdge - westEdge, BASE_H, M.concrete);

  // Blocks: houses with trees, a park, and the hotel row by the beach.
  const tarps: Pt[] = [];
  for (let bi = 0; bi < streets.length; bi++) {
    const y0 = streets[bi] + 9;
    const y1 = (streets[bi + 1] ?? BASE_H + 100) - 9;
    const cols = [westEdge, ...avenues, eastEdge];
    for (let ci = 0; ci < cols.length - 1; ci++) {
      const x0 = cols[ci] + 11;
      const x1 = cols[ci + 1] - 11;
      if (x1 - x0 < 20) continue;
      const park = (ci === 2 && (bi === 3 || bi === 4)) || (ci === 1 && bi === 7);
      if (park) {
        p.rect(x0, y0, x1 - x0, y1 - y0, M.grass);
        for (let k = 0; k < 40; k++) p.circle(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 4 + rnd() * 7, M.forest);
        p.ellipse(x0 + (x1 - x0) * 0.6, y0 + (y1 - y0) * 0.5, 30, 14, 0.3, M.water);
        continue;
      }
      const hotel = ci === cols.length - 2;
      p.rect(x0, y0, x1 - x0, y1 - y0, mixRefl(M.grass, M.soilLight, 0.3));
      if (hotel) {
        let y = y0 + 4;
        while (y < y1 - 20) {
          const h = 30 + rnd() * 40;
          const w = x1 - x0 - 30;
          const tall = 20 + rnd() * 50;
          const bx = x0 + 6 + w / 2;
          const by = y + h / 2;
          p.shadowRect(bx, by, w, h, 0, SHADOW[0] * tall, SHADOW[1] * tall, 0.42);
          p.rect(bx - w / 2, by - h / 2, w, h, pick(rnd, [M.roofWhite, M.roofLight, M.roofGray]));
          p.rect(x1 - 20, y + 6, 12, 18, [0.5, 0.42, 0.2, 0.08]);
          y += h + 10;
        }
        continue;
      }
      for (let y = y0 + 3; y < y1 - 10; y += 22) {
        for (let x = x0 + 3; x < x1 - 10; x += 20) {
          if (rnd() < 0.2) {
            p.circle(x + 8, y + 8, 6 + rnd() * 4, mixRefl(M.forest, M.veg, rnd() * 0.5));
            continue;
          }
          const w = 12 + rnd() * 5;
          const h = 11 + rnd() * 5;
          p.shadowRect(x + w / 2, y + h / 2, w, h, 0, SHADOW[0] * 5, SHADOW[1] * 5, 0.38);
          p.rect(x, y, w, h, pick(rnd, [M.roofTerracotta, M.roofLight, M.roofGray, M.roofWhite, M.roofTan]));
          if (after && rnd() < 0.07) tarps.push([x + 2, y + 2]);
          if (rnd() < 0.12) p.rect(x + w - 3, y + h + 1, 6, 4, [0.5, 0.42, 0.2, 0.08]);
        }
      }
    }
  }
  for (const x of avenues) p.line([[x, -10], [x, BASE_H + 10]], 16, M.asphalt);
  for (const y of streets) p.line([[westEdge, y], [eastEdge, y]], 12, M.asphalt);
  for (let k = 0; k < 140; k++) {
    const x = pick(rnd, avenues) + (rnd() < 0.5 ? -4 : 4);
    p.rect(x - 2, rnd() * BASE_H, 4, 7, pick(rnd, [M.roofWhite, M.boxRed, M.boxBlue, M.roofDark, M.roofGray]));
  }
  // Marina on the bay.
  for (let k = 0; k < 7; k++) {
    const y = 120 + k * 120;
    p.line([[150, y], [228, y]], 3, M.concrete);
    for (let b = 0; b < 6; b++) p.ellipse(160 + b * 12, y + (b % 2 ? 7 : -7), 3, 7, 0, M.roofWhite);
  }

  if (after) {
    // Storm surge: sand pushed inland from the beach, water standing in the
    // low blocks by the bay, and debris along the beachfront.
    const fans = coarseField((x, y) => n.fbm(x * 0.006 + 30, y * 0.012, 3), 4);
    const low = coarseField((x, y) => n.fbm(x * 0.004 - 12, y * 0.004 + 3, 4), 4);
    p.pixels((x, y) => {
      const sx = shoreX(y) - beachW;
      if (x > sx || x < 190) return null;
      const reach = 140 + fans(x, y) * 160;
      const sand = smoothstep(reach, reach * 0.35, sx - x);
      const lowWater = smoothstep(560, 260, x) * smoothstep(0.02, 0.16, low(x, y));
      if (sand > lowWater) return { r: mixRefl(M.sand, M.soilLight, 0.3), a: sand * 0.85 };
      if (lowWater > 0) return { r: mixRefl(M.flood, M.siltWater, 0.4), a: lowWater * 0.9 };
      return null;
    });
    for (const [x, y] of tarps) p.rect(x, y, 9, 8, M.tarp);
    for (let k = 0; k < 260; k++) {
      const y = rnd() * BASE_H;
      p.rect(shoreX(y) - beachW - rnd() * 160, y, 2 + rnd() * 4, 2 + rnd() * 3, pick(rnd, [M.roofWhite, M.roofDark, M.soil]));
    }
  }
  p.grain(n, 0.05);
};

export const scenes: Record<SiteKind, Scene> = {
  delta,
  vineyard,
  port,
  burn,
  mine,
  city
};

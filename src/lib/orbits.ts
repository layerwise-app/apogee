/**
 * Simple orbital mechanics for the constellation simulation: circular orbits
 * with J2 nodal precession (so sun-synchronous planes stay sun-synchronous),
 * Earth rotation, a low-precision sun position, and pass prediction.
 *
 * Units: kilometres, seconds, radians internally; degrees at the edges.
 * Times are milliseconds since the Unix epoch, like Date.now().
 * Frames: ECI is Earth-centred inertial (x toward the vernal equinox), ECEF is
 * Earth-centred Earth-fixed (x through 0° N 0° E, z through the North Pole).
 */
import type { Constellation, PlaneId } from '~/content/constellation';
import { satelliteName } from '~/content/constellation';

export type Vec3 = [number, number, number];

export const MU_EARTH = 398600.4418; // km^3/s^2
export const R_EQUATOR = 6378.137; // km (WGS84)
export const R_MEAN = 6371.0088; // km
export const WGS84_F = 1 / 298.257223563;
export const J2 = 1.08262668e-3;
export const OMEGA_EARTH = 7.2921150e-5; // rad/s
/** Nodal precession needed to follow the sun: one turn per tropical year. */
export const SUN_SYNC_RATE = (2 * Math.PI) / (365.2422 * 86400); // rad/s

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;

export const toRad = (deg: number) => deg * DEG;
export const toDeg = (rad: number) => rad / DEG;

export type Satellite = {
  id: string;
  plane: PlaneId;
  /** 0-based position in its plane. */
  slot: number;
  /** Semi-major axis (orbit radius), km. */
  a: number;
  /** Inclination, rad. */
  inc: number;
  /** Right ascension of the ascending node at epoch, rad. */
  raan0: number;
  /** Nodal precession rate, rad/s. */
  raanRate: number;
  /** Argument of latitude at epoch, rad. */
  u0: number;
  /** Mean motion, rad/s. */
  n: number;
  /** Epoch, ms. */
  epoch: number;
};

/* ------------------------------------------------------------------------ */
/* Time and the sun                                                          */
/* ------------------------------------------------------------------------ */

/** Days since J2000.0 (2000-01-01 12:00 TT, treated as UTC here). */
export function daysSinceJ2000(tMs: number) {
  return tMs / DAY_MS + 2440587.5 - 2451545.0;
}

/** Greenwich mean sidereal time, rad in [0, 2π). */
export function gmst(tMs: number) {
  const d = daysSinceJ2000(tMs);
  const deg = 280.46061837 + 360.98564736629 * d;
  return wrap2Pi(toRad(deg));
}

/** Unit vector from Earth to the sun in ECI (Astronomical Almanac, ~0.01°). */
export function sunDirectionEci(tMs: number): Vec3 {
  const n = daysSinceJ2000(tMs);
  const L = toRad(280.46 + 0.9856474 * n);
  const g = toRad(357.528 + 0.9856003 * n);
  const lambda = L + toRad(1.915) * Math.sin(g) + toRad(0.02) * Math.sin(2 * g);
  const eps = toRad(23.439 - 0.0000004 * n);
  return [
    Math.cos(lambda),
    Math.cos(eps) * Math.sin(lambda),
    Math.sin(eps) * Math.sin(lambda)
  ];
}

/** Right ascension of the sun, rad. */
export function sunRightAscension(tMs: number) {
  const [x, y] = sunDirectionEci(tMs);
  return wrap2Pi(Math.atan2(y, x));
}

export function sunDirectionEcef(tMs: number): Vec3 {
  return eciToEcef(sunDirectionEci(tMs), gmst(tMs));
}

/** Where the sun is directly overhead, degrees. */
export function subsolarPoint(tMs: number) {
  const [x, y, z] = sunDirectionEcef(tMs);
  return { lat: toDeg(Math.asin(z)), lon: toDeg(Math.atan2(y, x)) };
}

/** Sun elevation above the horizon at a place, degrees (spherical Earth). */
export function sunElevationDeg(lat: number, lon: number, tMs: number) {
  const s = sunDirectionEcef(tMs);
  const p = unitFromLatLon(lat, lon);
  return toDeg(Math.asin(clamp(dot(s, p), -1, 1)));
}

/* ------------------------------------------------------------------------ */
/* Orbits                                                                    */
/* ------------------------------------------------------------------------ */

export function orbitRadius(altitudeKm: number) {
  return R_EQUATOR + altitudeKm;
}

export function meanMotion(a: number) {
  return Math.sqrt(MU_EARTH / (a * a * a));
}

export function orbitalPeriodSeconds(a: number) {
  return (2 * Math.PI) / meanMotion(a);
}

export function orbitalSpeed(a: number) {
  return Math.sqrt(MU_EARTH / a);
}

/** J2 nodal precession rate for a circular orbit, rad/s. */
export function nodalPrecessionRate(a: number, inc: number) {
  const k = R_EQUATOR / a;
  return -1.5 * meanMotion(a) * J2 * k * k * Math.cos(inc);
}

/** Inclination that makes a circular orbit sun-synchronous, rad. */
export function sunSynchronousInclination(a: number) {
  const k = R_EQUATOR / a;
  const cosI = -SUN_SYNC_RATE / (1.5 * meanMotion(a) * J2 * k * k);
  return Math.acos(clamp(cosI, -1, 1));
}

/** "10:30" → 10.5 */
export function parseLocalTime(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h + m / 60;
}

/** Builds every satellite from the constellation content. */
export function buildConstellation(config: Constellation): Satellite[] {
  const epoch = Date.parse(config.epoch);
  const a = orbitRadius(config.altitudeKm);
  const inc = sunSynchronousInclination(a);
  const n = meanMotion(a);
  const raanRate = nodalPrecessionRate(a, inc);
  const sunRa = sunRightAscension(epoch);
  const sats: Satellite[] = [];
  for (const plane of config.planes) {
    // The ascending node sits 12 h from the descending node; local solar
    // time maps to right ascension relative to the sun.
    const ltdn = parseLocalTime(plane.descendingNodeLocalTime);
    const raan0 = wrap2Pi(sunRa + toRad(ltdn * 15));
    for (let slot = 0; slot < config.satellitesPerPlane; slot++) {
      sats.push({
        id: satelliteName(plane.id, slot),
        plane: plane.id,
        slot,
        a,
        inc,
        raan0,
        raanRate,
        u0: wrap2Pi(
          toRad(plane.phaseOffsetDeg + (slot * 360) / config.satellitesPerPlane)
        ),
        n,
        epoch
      });
    }
  }
  return sats;
}

/** Position in ECI, km. */
export function eciPosition(sat: Satellite, tMs: number): Vec3 {
  const dt = (tMs - sat.epoch) / 1000;
  const raan = sat.raan0 + sat.raanRate * dt;
  const u = sat.u0 + sat.n * dt;
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const ci = Math.cos(sat.inc);
  const si = Math.sin(sat.inc);
  return [
    sat.a * (cO * cu - sO * su * ci),
    sat.a * (sO * cu + cO * su * ci),
    sat.a * (su * si)
  ];
}

/** Velocity in ECI, km/s (ignores the tiny precession term). */
export function eciVelocity(sat: Satellite, tMs: number): Vec3 {
  const dt = (tMs - sat.epoch) / 1000;
  const raan = sat.raan0 + sat.raanRate * dt;
  const u = sat.u0 + sat.n * dt;
  const v = sat.a * sat.n;
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const ci = Math.cos(sat.inc);
  const si = Math.sin(sat.inc);
  return [
    v * (-cO * su - sO * cu * ci),
    v * (-sO * su + cO * cu * ci),
    v * (cu * si)
  ];
}

/** The orbit as a ring of ECI points, km, for drawing. */
export function orbitRing(sat: Satellite, tMs: number, segments = 128): Vec3[] {
  const dt = (tMs - sat.epoch) / 1000;
  const raan = sat.raan0 + sat.raanRate * dt;
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const ci = Math.cos(sat.inc);
  const si = Math.sin(sat.inc);
  const ring: Vec3[] = [];
  for (let k = 0; k <= segments; k++) {
    const u = (k / segments) * 2 * Math.PI;
    const cu = Math.cos(u);
    const su = Math.sin(u);
    ring.push([
      sat.a * (cO * cu - sO * su * ci),
      sat.a * (sO * cu + cO * su * ci),
      sat.a * (su * si)
    ]);
  }
  return ring;
}

/* ------------------------------------------------------------------------ */
/* Frames and geodesy                                                        */
/* ------------------------------------------------------------------------ */

export function eciToEcef([x, y, z]: Vec3, theta: number): Vec3 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c * x + s * y, -s * x + c * y, z];
}

/** WGS84 geodetic latitude/longitude (degrees) and altitude (km). */
export function ecefToGeodetic([x, y, z]: Vec3) {
  const e2 = WGS84_F * (2 - WGS84_F);
  const lon = Math.atan2(y, x);
  const p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - e2));
  let alt = 0;
  for (let k = 0; k < 6; k++) {
    const s = Math.sin(lat);
    const N = R_EQUATOR / Math.sqrt(1 - e2 * s * s);
    alt = p / Math.cos(lat) - N;
    lat = Math.atan2(z, p * (1 - (e2 * N) / (N + alt)));
  }
  return { lat: toDeg(lat), lon: toDeg(lon), alt };
}

/** Unit vector in ECEF for a latitude/longitude in degrees (spherical). */
export function unitFromLatLon(lat: number, lon: number): Vec3 {
  const la = toRad(lat);
  const lo = toRad(lon);
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

export function latLonFromUnit([x, y, z]: Vec3) {
  return { lat: toDeg(Math.asin(clamp(z, -1, 1))), lon: toDeg(Math.atan2(y, x)) };
}

/** Angle between two places at Earth's centre, rad. */
export function centralAngle(lat1: number, lon1: number, lat2: number, lon2: number) {
  return Math.acos(clamp(dot(unitFromLatLon(lat1, lon1), unitFromLatLon(lat2, lon2)), -1, 1));
}

/** How far the satellite leans from straight down to see a point λ away. */
export function offNadirDeg(lambda: number, a: number) {
  return toDeg(Math.atan2(R_MEAN * Math.sin(lambda), a - R_MEAN * Math.cos(lambda)));
}

/** Satellite elevation above the horizon for a ground point λ away, degrees. */
export function elevationDeg(lambda: number, a: number) {
  return toDeg(Math.atan2(Math.cos(lambda) - R_MEAN / a, Math.sin(lambda)));
}

/** Largest central angle a satellite can image at a given off-nadir limit. */
export function maxCentralAngleForOffNadir(offNadir: number, a: number) {
  const eta = toRad(offNadir);
  return Math.asin(clamp((a / R_MEAN) * Math.sin(eta), -1, 1)) - eta;
}

/** Largest central angle at which a station sees the satellite above minElev. */
export function maxCentralAngleForElevation(minElev: number, a: number) {
  const e = toRad(minElev);
  return Math.acos(clamp((R_MEAN / a) * Math.cos(e), -1, 1)) - e;
}

export type SatelliteState = {
  eci: Vec3;
  ecef: Vec3;
  lat: number;
  lon: number;
  /** Height above the WGS84 ellipsoid, km. Varies with latitude. */
  altKm: number;
  /** Inertial speed, km/s. */
  speedKms: number;
  /** Speed of the point below the satellite across the ground, km/s. */
  groundSpeedKms: number;
};

export function satelliteState(sat: Satellite, tMs: number): SatelliteState {
  const eci = eciPosition(sat, tMs);
  const vel = eciVelocity(sat, tMs);
  const theta = gmst(tMs);
  const ecef = eciToEcef(eci, theta);
  const geo = ecefToGeodetic(ecef);
  // Velocity relative to the rotating Earth, scaled down to the surface.
  const rel: Vec3 = [
    vel[0] + OMEGA_EARTH * eci[1],
    vel[1] - OMEGA_EARTH * eci[0],
    vel[2]
  ];
  return {
    eci,
    ecef,
    lat: geo.lat,
    lon: geo.lon,
    altKm: geo.alt,
    speedKms: Math.hypot(...vel),
    groundSpeedKms: Math.hypot(...rel) * (R_MEAN / sat.a)
  };
}

/** Unit vector below the satellite, ECEF (cheap; for pass searches). */
export function subSatelliteUnit(sat: Satellite, tMs: number): Vec3 {
  const p = eciToEcef(eciPosition(sat, tMs), gmst(tMs));
  const r = Math.hypot(...p);
  return [p[0] / r, p[1] / r, p[2] / r];
}

/** Points below the satellite from t0 to t1, as ECEF unit vectors. */
export function groundTrack(sat: Satellite, t0: number, t1: number, stepMs = 30_000) {
  const points: Vec3[] = [];
  for (let t = t0; t <= t1; t += stepMs) points.push(subSatelliteUnit(sat, t));
  return points;
}

/* ------------------------------------------------------------------------ */
/* Passes                                                                    */
/* ------------------------------------------------------------------------ */

export type Target = { lat: number; lon: number };

export type Pass = {
  satId: string;
  /** The site enters the satellite's field of regard. */
  startMs: number;
  /** Closest approach: the capture moment. */
  tcaMs: number;
  /** The site leaves the field of regard. */
  endMs: number;
  offNadirDeg: number;
  /** Ground distance from the track to the site at closest approach, km. */
  groundRangeKm: number;
  sunElevationDeg: number;
};

export type PassOptions = {
  maxOffNadirDeg: number;
  /** Optical imaging needs daylight; leave undefined to ignore the sun. */
  minSunElevationDeg?: number;
  /** How far ahead to search, ms. Default 36 h. */
  horizonMs?: number;
  /** Coarse search step, ms. Default 20 s. */
  stepMs?: number;
};

function angleTo(sat: Satellite, site: Vec3, tMs: number) {
  return Math.acos(clamp(dot(subSatelliteUnit(sat, tMs), site), -1, 1));
}

/** Finds the moment the angle crosses `limit` between t0 (outside) and t1. */
function bisectCrossing(
  sat: Satellite,
  site: Vec3,
  t0: number,
  t1: number,
  limit: number,
  entering: boolean
) {
  let lo = t0;
  let hi = t1;
  for (let k = 0; k < 24 && hi - lo > 50; k++) {
    const mid = (lo + hi) / 2;
    const inside = angleTo(sat, site, mid) <= limit;
    if (inside === entering) hi = mid;
    else lo = mid;
  }
  return entering ? hi : lo;
}

/** Time of the smallest angle between t0 and t1 (golden-section search). */
function closestApproach(sat: Satellite, site: Vec3, t0: number, t1: number) {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = t0;
  let b = t1;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  for (let k = 0; k < 40 && b - a > 20; k++) {
    if (angleTo(sat, site, c) < angleTo(sat, site, d)) b = d;
    else a = c;
    c = b - g * (b - a);
    d = a + g * (b - a);
  }
  return (a + b) / 2;
}

/** The next pass of one satellite over a target that meets the options. */
export function findNextPass(
  sat: Satellite,
  target: Target,
  fromMs: number,
  options: PassOptions
): Pass | null {
  const horizon = options.horizonMs ?? 36 * 3_600_000;
  const step = options.stepMs ?? 20_000;
  const limit = maxCentralAngleForOffNadir(options.maxOffNadirDeg, sat.a);
  const site = unitFromLatLon(target.lat, target.lon);

  let prevT = fromMs;
  let prevInside = angleTo(sat, site, fromMs) <= limit;
  let start = prevInside ? fromMs : NaN;

  for (let t = fromMs + step; t <= fromMs + horizon; t += step) {
    const inside = angleTo(sat, site, t) <= limit;
    if (inside && !prevInside) {
      start = bisectCrossing(sat, site, prevT, t, limit, true);
    } else if (!inside && prevInside) {
      const end = bisectCrossing(sat, site, prevT, t, limit, false);
      const tca = closestApproach(sat, site, start, end);
      const lambda = angleTo(sat, site, tca);
      const sunEl = sunElevationDeg(target.lat, target.lon, tca);
      if (options.minSunElevationDeg === undefined || sunEl >= options.minSunElevationDeg) {
        return {
          satId: sat.id,
          startMs: start,
          tcaMs: tca,
          endMs: end,
          offNadirDeg: offNadirDeg(lambda, sat.a),
          groundRangeKm: lambda * R_MEAN,
          sunElevationDeg: sunEl
        };
      }
    }
    prevInside = inside;
    prevT = t;
  }
  return null;
}

/** The earliest qualifying pass across all satellites. */
export function findBestPass(
  sats: Satellite[],
  target: Target,
  fromMs: number,
  options: PassOptions
): Pass | null {
  let best: Pass | null = null;
  for (const sat of sats) {
    const pass = findNextPass(sat, target, fromMs, {
      ...options,
      horizonMs: best ? best.startMs - fromMs : options.horizonMs
    });
    if (pass && (!best || pass.startMs < best.startMs)) best = pass;
  }
  return best;
}

/** Number of qualifying passes over a target in a time window. */
export function countPasses(
  sats: Satellite[],
  target: Target,
  fromMs: number,
  durationMs: number,
  options: PassOptions
) {
  let count = 0;
  for (const sat of sats) {
    let t = fromMs;
    while (t < fromMs + durationMs) {
      const pass = findNextPass(sat, target, t, {
        ...options,
        horizonMs: fromMs + durationMs - t
      });
      if (!pass) break;
      count++;
      t = pass.endMs + 60_000;
    }
  }
  return count;
}

export type StationContact = {
  stationId: string;
  stationName: string;
  aosMs: number;
  losMs: number;
};

/**
 * The current or next contact between a satellite and any ground station.
 * If the satellite is in contact now, `aosMs` is in the past.
 */
export function findNextStationContact(
  sat: Satellite,
  stations: { id: string; name: string; lat: number; lon: number }[],
  fromMs: number,
  minElevationDeg: number,
  horizonMs = 6 * 3_600_000
): StationContact | null {
  const limit = maxCentralAngleForElevation(minElevationDeg, sat.a);
  let best: StationContact | null = null;
  for (const st of stations) {
    const site = unitFromLatLon(st.lat, st.lon);
    const step = 20_000;
    let prevT = fromMs;
    let prevInside = angleTo(sat, site, fromMs) <= limit;
    let aos = prevInside ? walkBack(sat, site, fromMs, limit) : NaN;
    const end = fromMs + (best ? Math.min(horizonMs, best.aosMs - fromMs) : horizonMs);
    for (let t = fromMs + step; t <= end + step * 60; t += step) {
      const inside = angleTo(sat, site, t) <= limit;
      if (inside && !prevInside) {
        if (t > end) break;
        aos = bisectCrossing(sat, site, prevT, t, limit, true);
      } else if (!inside && prevInside) {
        const los = bisectCrossing(sat, site, prevT, t, limit, false);
        if (!best || aos < best.aosMs) {
          best = { stationId: st.id, stationName: st.name, aosMs: aos, losMs: los };
        }
        break;
      }
      prevInside = inside;
      prevT = t;
    }
  }
  return best;
}

function walkBack(sat: Satellite, site: Vec3, fromMs: number, limit: number) {
  let t = fromMs;
  while (t > fromMs - 30 * 60_000 && angleTo(sat, site, t - 20_000) <= limit) t -= 20_000;
  return bisectCrossing(sat, site, t - 20_000, t, limit, true);
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

export function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrap2Pi(rad: number) {
  const t = rad % (2 * Math.PI);
  return t < 0 ? t + 2 * Math.PI : t;
}

/** Wraps a longitude to (-180, 180]. */
export function wrapLon(deg: number) {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

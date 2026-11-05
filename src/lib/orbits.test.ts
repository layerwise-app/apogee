import { describe, expect, it } from 'vitest';
import { constellation } from '~/content/constellation';
import { sites } from '~/content/sites';
import {
  buildConstellation,
  centralAngle,
  countPasses,
  ecefToGeodetic,
  eciPosition,
  findBestPass,
  findNextPass,
  findNextStationContact,
  gmst,
  maxCentralAngleForOffNadir,
  orbitalPeriodSeconds,
  orbitalSpeed,
  orbitRadius,
  satelliteState,
  subsolarPoint,
  sunDirectionEci,
  sunElevationDeg,
  sunSynchronousInclination,
  toDeg,
  unitFromLatLon,
  wrapLon
} from './orbits';

const sats = buildConstellation(constellation);
const a = orbitRadius(constellation.altitudeKm);
const t0 = Date.parse('2026-11-05T12:00:00Z');
const passOptions = {
  maxOffNadirDeg: constellation.maxOffNadirDeg,
  minSunElevationDeg: constellation.minSunElevationDeg
};

describe('orbit basics', () => {
  it('builds 48 satellites in three planes of 16', () => {
    expect(sats).toHaveLength(48);
    for (const plane of ['A', 'B', 'C']) {
      expect(sats.filter((s) => s.plane === plane)).toHaveLength(16);
    }
    expect(new Set(sats.map((s) => s.id)).size).toBe(48);
    expect(sats[0].id).toBe('AO-A01');
  });

  it('has a 95-minute period and 7.6 km/s speed at 525 km', () => {
    expect(orbitalPeriodSeconds(a) / 60).toBeCloseTo(95.1, 0);
    expect(orbitalSpeed(a)).toBeCloseTo(7.599, 2);
  });

  it('flies a sun-synchronous inclination near 97.5°', () => {
    const inc = toDeg(sunSynchronousInclination(a));
    expect(inc).toBeGreaterThan(97.3);
    expect(inc).toBeLessThan(97.7);
  });

  it('keeps a constant radius on a circular orbit', () => {
    for (let k = 0; k < 20; k++) {
      const p = eciPosition(sats[5], t0 + k * 317_000);
      expect(Math.hypot(...p)).toBeCloseTo(a, 6);
    }
  });

  it('returns to the same place in inertial space after one period', () => {
    const period = orbitalPeriodSeconds(a) * 1000;
    const p1 = eciPosition(sats[0], t0);
    const p2 = eciPosition(sats[0], t0 + period);
    // Only nodal precession (about 0.065° per orbit) moves it.
    expect(Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2])).toBeLessThan(10);
  });

  it('spaces satellites evenly within a plane', () => {
    const p = sats.filter((s) => s.plane === 'B').map((s) => eciPosition(s, t0));
    const gaps = p.map((v, k) => {
      const w = p[(k + 1) % p.length];
      return toDeg(Math.acos((v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) / (a * a)));
    });
    for (const g of gaps) expect(g).toBeCloseTo(22.5, 3);
  });

  it('never flies over latitudes beyond 180° minus the inclination', () => {
    let maxLat = 0;
    for (let t = t0; t < t0 + 6_000_000; t += 30_000) {
      maxLat = Math.max(maxLat, Math.abs(satelliteState(sats[3], t).lat));
    }
    expect(maxLat).toBeGreaterThan(81.5);
    expect(maxLat).toBeLessThan(83);
  });

  it('reports altitude above the ellipsoid, which varies with latitude', () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let t = t0; t < t0 + 6_000_000; t += 20_000) {
      const { altKm } = satelliteState(sats[9], t);
      lo = Math.min(lo, altKm);
      hi = Math.max(hi, altKm);
    }
    expect(lo).toBeCloseTo(525, 0);
    expect(hi).toBeGreaterThan(540);
    expect(hi).toBeLessThan(547);
  });

  it('reports a ground speed a little under the orbital speed', () => {
    const s = satelliteState(sats[0], t0);
    expect(s.speedKms).toBeCloseTo(7.599, 2);
    expect(s.groundSpeedKms).toBeGreaterThan(6.7);
    expect(s.groundSpeedKms).toBeLessThan(7.3);
  });
});

describe('time, frames, and the sun', () => {
  it('matches the known GMST at J2000', () => {
    expect(toDeg(gmst(Date.parse('2000-01-01T12:00:00Z')))).toBeCloseTo(280.46, 2);
  });

  it('turns once per sidereal day', () => {
    const d = gmst(t0 + 86_164_091) - gmst(t0);
    expect(Math.abs(d)).toBeLessThan(1e-4);
  });

  it('round-trips geodetic coordinates on the surface', () => {
    const lat = 43.6;
    const lon = 1.44;
    const e2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
    const la = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180;
    const N = 6378.137 / Math.sqrt(1 - e2 * Math.sin(la) ** 2);
    const g = ecefToGeodetic([
      N * Math.cos(la) * Math.cos(lo),
      N * Math.cos(la) * Math.sin(lo),
      N * (1 - e2) * Math.sin(la)
    ]);
    expect(g.lat).toBeCloseTo(lat, 6);
    expect(g.lon).toBeCloseTo(lon, 6);
    expect(g.alt).toBeCloseTo(0, 4);
  });

  it('puts the sun over the Tropic of Cancer at the June solstice', () => {
    const dir = sunDirectionEci(Date.parse('2026-06-21T08:24:00Z'));
    expect(toDeg(Math.asin(dir[2]))).toBeCloseTo(23.44, 1);
  });

  it('puts the subsolar point near Greenwich at noon UTC', () => {
    const p = subsolarPoint(Date.parse('2026-03-20T12:07:00Z'));
    expect(Math.abs(p.lat)).toBeLessThan(0.5);
    expect(Math.abs(p.lon)).toBeLessThan(1.5);
  });

  it('knows day from night', () => {
    const noonToulouse = Date.parse('2026-11-05T11:50:00Z');
    expect(sunElevationDeg(43.6, 1.44, noonToulouse)).toBeGreaterThan(25);
    expect(sunElevationDeg(43.6, 1.44, noonToulouse + 12 * 3_600_000)).toBeLessThan(-40);
  });

  it('wraps longitudes', () => {
    expect(wrapLon(190)).toBe(-170);
    expect(wrapLon(-190)).toBe(170);
    expect(wrapLon(180)).toBe(180);
  });

  it('flies its descending node near local mid-morning for plane A', () => {
    const sat = sats.find((s) => s.id === 'AO-A01')!;
    // Find a southbound equator crossing and check its local solar time.
    let prev = satelliteState(sat, t0);
    for (let t = t0 + 10_000; t < t0 + 6_000_000; t += 10_000) {
      const cur = satelliteState(sat, t);
      if (prev.lat > 0 && cur.lat <= 0) {
        const sun = subsolarPoint(t);
        const localSolarHours = (((12 + (cur.lon - sun.lon) / 15) % 24) + 24) % 24;
        // Mean solar time is 10:30; the equation of time moves the apparent
        // sun by up to 16 minutes either way.
        expect(localSolarHours).toBeGreaterThan(10.5 - 0.45);
        expect(localSolarHours).toBeLessThan(10.5 + 0.45);
        return;
      }
      prev = cur;
    }
    throw new Error('no descending node found');
  });
});

describe('passes', () => {
  const site = sites[0];

  it('finds a daylight pass within the off-nadir limit', () => {
    const pass = findNextPass(sats[0], site, t0, passOptions);
    expect(pass).not.toBeNull();
    const p = pass!;
    expect(p.startMs).toBeGreaterThanOrEqual(t0);
    expect(p.tcaMs).toBeGreaterThan(p.startMs);
    expect(p.endMs).toBeGreaterThan(p.tcaMs);
    expect(p.offNadirDeg).toBeLessThanOrEqual(constellation.maxOffNadirDeg + 0.01);
    expect(p.sunElevationDeg).toBeGreaterThanOrEqual(constellation.minSunElevationDeg);
    // At closest approach the satellite really is that close to the site.
    const s = satelliteState(sats[0], p.tcaMs);
    const lambda = centralAngle(s.lat, s.lon, site.lat, site.lon);
    expect(lambda).toBeLessThanOrEqual(
      maxCentralAngleForOffNadir(constellation.maxOffNadirDeg, a) + 1e-3
    );
  });

  it('assigns the earliest satellite across the constellation', () => {
    const best = findBestPass(sats, site, t0, passOptions)!;
    expect(best).not.toBeNull();
    for (const sat of sats.slice(0, 12)) {
      const p = findNextPass(sat, site, t0, passOptions);
      if (p) expect(p.startMs).toBeGreaterThanOrEqual(best.startMs - 1);
    }
  });

  it('revisits every preset site several times a day, never more than 12', () => {
    for (const s of sites) {
      const n = countPasses(sats, s, t0, 86_400_000, passOptions);
      expect(n, s.name).toBeGreaterThanOrEqual(4);
      expect(n, s.name).toBeLessThanOrEqual(12);
    }
  });

  it('finds the next ground station contact within one orbit or so', () => {
    const c = findNextStationContact(
      sats[0],
      constellation.groundStations,
      t0,
      constellation.stationMinElevationDeg
    )!;
    expect(c).not.toBeNull();
    expect(c.losMs).toBeGreaterThan(c.aosMs);
    expect(c.aosMs - t0).toBeLessThan(2 * 3_600_000);
    // Contacts at 5° elevation last a handful of minutes.
    expect((c.losMs - c.aosMs) / 60_000).toBeGreaterThan(1);
    expect((c.losMs - c.aosMs) / 60_000).toBeLessThan(13);
  });

  it('computes unit vectors on the sphere', () => {
    expect(Math.hypot(...unitFromLatLon(12, 34))).toBeCloseTo(1, 12);
  });
});

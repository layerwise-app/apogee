import { constellation } from '~/content/constellation';
import type { Satellite } from '~/lib/orbits';
import { buildConstellation, unitFromLatLon, dot, subSatelliteUnit } from '~/lib/orbits';

let cache: Satellite[] | null = null;

/** The 48 satellites, built once from src/content/constellation.ts. */
export function getSatellites(): Satellite[] {
  if (!cache) cache = buildConstellation(constellation);
  return cache;
}

/** The satellite whose ground point is nearest a place at a time. */
export function nearestSatellite(lat: number, lon: number, tMs: number) {
  const sats = getSatellites();
  const target = unitFromLatLon(lat, lon);
  let best = 0;
  let bestDot = -2;
  sats.forEach((s, i) => {
    const d = dot(subSatelliteUnit(s, tMs), target);
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  });
  return best;
}

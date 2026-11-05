import type { Site, SiteKind } from '~/content/sites';
import { isLand } from '~/lib/earth/land';
import { formatLat, formatLon } from '~/lib/format';

/** True when there is open water within about 1.5° of the point. */
function nearCoast(lat: number, lon: number) {
  for (const d of [0.8, 1.5]) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const la = Math.max(-89, Math.min(89, lat + Math.sin(a) * d));
      if (!isLand(la, lon + (Math.cos(a) * d) / Math.max(0.2, Math.cos((la * Math.PI) / 180)))) return true;
    }
  }
  return false;
}

/**
 * A capture for a point someone clicked on the globe. The kind of scene
 * follows the latitude (forests in the north, deserts in the subtropics,
 * deltas in the tropics) and whether the point is on a coast, and the seed
 * follows the coordinates, so the same point always produces the same picture.
 */
export function customSite(lat: number, lon: number): Site {
  const qLat = Math.round(lat * 10) / 10;
  const qLon = Math.round(lon * 10) / 10;
  const seed = Math.abs(Math.round(qLat * 1000) * 7919 + Math.round(qLon * 1000) * 104729) % 100000;
  const a = Math.abs(qLat);
  const roll = seed % 3;
  const coast = nearCoast(qLat, qLon);
  let kind: SiteKind;
  if (a >= 50) kind = 'burn';
  else if (coast) kind = a >= 18 ? (roll === 0 ? 'port' : 'city') : roll === 0 ? 'port' : 'delta';
  else if (a >= 36) kind = 'vineyard';
  else if (a >= 18) kind = 'mine';
  else kind = 'delta';
  const widths: Record<SiteKind, number> = {
    delta: 4.2,
    vineyard: 1.6,
    port: 1.2,
    burn: 5.5,
    mine: 4.8,
    city: 1.9
  };
  return {
    id: `custom-${qLat}-${qLon}`,
    name: 'Custom target',
    region: `${formatLat(qLat, 2)} ${formatLon(qLon, 2)}`,
    lat: qLat,
    lon: qLon,
    kind,
    subject: 'Custom target',
    caption: 'A capture of the point you chose, drawn by the same simulation as the preset sites.',
    before: '30 days ago',
    after: 'Today',
    sceneWidthKm: widths[kind],
    seed,
    cloudPercent: seed % 9,
    focus: [0.5, 0.5]
  };
}

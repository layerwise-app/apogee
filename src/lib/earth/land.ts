import { LAND_BITS, LAND_DOT_COUNT, LAND_ROW_STEP_DEG } from './land-data';

/**
 * Decodes the land-dot bitset (built from Natural Earth by
 * scripts/build-earth.mjs) into unit vectors in ECEF: x, y, z per dot.
 * Dots sit in rows of equal latitude, evenly spaced along each row.
 */
export function decodeLandDots(): Float32Array<ArrayBuffer> {
  const bin = atob(LAND_BITS);
  const out = new Float32Array(LAND_DOT_COUNT * 3);
  const rows = Math.round(180 / LAND_ROW_STEP_DEG);
  let bit = 0;
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const lat = ((-90 + (r + 0.5) * LAND_ROW_STEP_DEG) * Math.PI) / 180;
    const count = Math.max(
      1,
      Math.round((360 * Math.cos(lat)) / LAND_ROW_STEP_DEG)
    );
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    for (let j = 0; j < count; j++, bit++) {
      if (!(bin.charCodeAt(bit >> 3) & (1 << (bit & 7)))) continue;
      const lon = ((-180 + ((j + 0.5) * 360) / count) * Math.PI) / 180;
      out[k++] = cl * Math.cos(lon);
      out[k++] = cl * Math.sin(lon);
      out[k++] = sl;
    }
  }
  return out;
}

let rowStarts: Int32Array | null = null;

/** True when a latitude/longitude falls on land (to the dot grid's precision). */
export function isLand(lat: number, lon: number): boolean {
  const rows = Math.round(180 / LAND_ROW_STEP_DEG);
  if (!rowStarts) {
    rowStarts = new Int32Array(rows + 1);
    let bit = 0;
    for (let r = 0; r < rows; r++) {
      rowStarts[r] = bit;
      const la = ((-90 + (r + 0.5) * LAND_ROW_STEP_DEG) * Math.PI) / 180;
      bit += Math.max(1, Math.round((360 * Math.cos(la)) / LAND_ROW_STEP_DEG));
    }
    rowStarts[rows] = bit;
  }
  const r = Math.min(rows - 1, Math.max(0, Math.floor((lat + 90) / LAND_ROW_STEP_DEG)));
  const count = rowStarts[r + 1] - rowStarts[r];
  const j = Math.min(count - 1, Math.max(0, Math.floor(((((lon + 180) % 360) + 360) % 360) / (360 / count))));
  const bit = rowStarts[r] + j;
  return (LAND_BITS_BIN().charCodeAt(bit >> 3) & (1 << (bit & 7))) !== 0;
}

let bin: string | null = null;
function LAND_BITS_BIN() {
  if (!bin) bin = atob(LAND_BITS);
  return bin;
}

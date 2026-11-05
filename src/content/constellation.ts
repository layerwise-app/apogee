/**
 * The constellation that the globe, tasking demo, and telemetry simulate.
 * Every live readout on the site is computed from these numbers by
 * `src/lib/orbits.ts`, so changing them changes the simulation.
 */

export type PlaneId = 'A' | 'B' | 'C';

export type OrbitalPlane = {
  id: PlaneId;
  /** Local solar time when satellites cross the equator going south, "HH:MM". */
  descendingNodeLocalTime: string;
  /** Shifts every satellite in this plane along its orbit, in degrees. */
  phaseOffsetDeg: number;
};

export type GroundStation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export const constellation = {
  /** Satellite positions are propagated from this instant. */
  epoch: '2026-01-01T00:00:00Z',
  /** Circular orbit height above the equator. */
  altitudeKm: 525,
  satellitesPerPlane: 16,
  planes: [
    { id: 'A', descendingNodeLocalTime: '10:30', phaseOffsetDeg: 0 },
    { id: 'B', descendingNodeLocalTime: '12:00', phaseOffsetDeg: 7.5 },
    { id: 'C', descendingNodeLocalTime: '13:30', phaseOffsetDeg: 15 }
  ] satisfies OrbitalPlane[],
  /** How far a satellite may lean to photograph a site off its ground track. */
  maxOffNadirDeg: 20,
  /** Sites must be in daylight, with the sun at least this high, to be imaged. */
  minSunElevationDeg: 10,
  /** Downlink stations. "Next pass" in the hero telemetry counts down to these. */
  groundStations: [
    { id: 'TLS', name: 'Toulouse', lat: 43.56, lon: 1.48 },
    { id: 'DEN', name: 'Denver', lat: 39.74, lon: -104.99 },
    { id: 'SVB', name: 'Svalbard', lat: 78.23, lon: 15.39 },
    { id: 'PUQ', name: 'Punta Arenas', lat: -53.16, lon: -70.91 }
  ] satisfies GroundStation[],
  stationMinElevationDeg: 5,
  /** The hero globe runs this many times faster than real time. */
  simTimeScale: 60,
  /** Tasking demo: real seconds the countdown to the next pass takes. */
  taskingCountdownSeconds: 4.5,
  /** Tasking demo: real seconds the pass over the site takes. */
  taskingPassSeconds: 2.6
};

export type Constellation = typeof constellation;

/** Satellite names look like AO-A07: plane letter, then position in plane. */
export function satelliteName(plane: PlaneId, index: number) {
  return `AO-${plane}${String(index + 1).padStart(2, '0')}`;
}

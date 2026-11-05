/**
 * Launch history. Each launch is one file in src/content/missions/, named
 * after its id (ao-7.ts). Copy an existing file to add one; the Missions page,
 * the home page's "Next launch", and the counts update on their own.
 */

export type MissionStatus = 'operational' | 'retired' | 'scheduled' | 'failed';

export type Mission = {
  /** Shown everywhere, like "AO-6". */
  id: string;
  /** Launch time in UTC, ISO 8601, like "2026-12-10T09:42:00Z". */
  launchAt: string;
  vehicle: string;
  launchSite: string;
  /** Satellites deployed (or planned, for scheduled launches). */
  satellites: number;
  /** Orbital plane(s) the satellites joined. */
  plane: string;
  status: MissionStatus;
  /** One or two plain sentences. */
  summary: string;
};

const files = import.meta.glob<{ default: Mission }>('./missions/*.ts', {
  eager: true
});

/** Every launch, oldest first. */
export const missions: Mission[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => Date.parse(a.launchAt) - Date.parse(b.launchAt));

/** The earliest scheduled launch, if any. */
export const nextMission: Mission | undefined = missions.find(
  (m) => m.status === 'scheduled'
);

export const statusLabels: Record<MissionStatus, string> = {
  operational: 'Operational',
  retired: 'Retired',
  scheduled: 'Scheduled',
  failed: 'Lost at launch'
};

/** Satellites from launches that are still operating. */
export const satellitesInService = missions
  .filter((m) => m.status === 'operational')
  .reduce((sum, m) => sum + m.satellites, 0);

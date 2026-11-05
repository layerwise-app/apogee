import type { Mission } from '../missions';

export default {
  id: 'AO-6',
  launchAt: '2026-12-10T09:42:00Z',
  vehicle: 'Halyard dedicated',
  launchSite: 'Andøya, Norway',
  satellites: 8,
  plane: 'A and B spares',
  status: 'scheduled',
  summary:
    'Eight in-orbit spares, parked 20 km below planes A and B, so a failed satellite is replaced in weeks instead of a launch cycle.'
} satisfies Mission;

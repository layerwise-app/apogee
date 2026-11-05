import type { Mission } from '../missions';

export default {
  id: 'AO-5',
  launchAt: '2025-09-30T01:12:00Z',
  vehicle: 'Halyard dedicated',
  launchSite: 'Kourou, French Guiana',
  satellites: 16,
  plane: 'C',
  status: 'operational',
  summary:
    'Completed the 48-satellite constellation with the 13:30 afternoon plane. Up to 12 revisits a day since November 2025.'
} satisfies Mission;

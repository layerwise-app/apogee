import type { Mission } from '../missions';

export default {
  id: 'AO-1',
  launchAt: '2022-06-14T21:19:00Z',
  vehicle: 'Kestrel 2 rideshare',
  launchSite: 'Vandenberg, California',
  satellites: 2,
  plane: 'Test orbit, 97.4°',
  status: 'retired',
  summary:
    'Two pathfinders proved the 50 cm telescope and the eight-band sensor. Both were deorbited in 2025.'
} satisfies Mission;

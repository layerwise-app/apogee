import type { Mission } from '../missions';

export default {
  id: 'AO-2',
  launchAt: '2023-04-19T18:02:00Z',
  vehicle: 'Kestrel 2 rideshare',
  launchSite: 'Vandenberg, California',
  satellites: 8,
  plane: 'A',
  status: 'operational',
  summary:
    'The first eight production satellites, flying the 10:30 morning plane. Daily imagery service began in July 2023.'
} satisfies Mission;

import type { Mission } from '../missions';

export default {
  id: 'AO-3',
  launchAt: '2023-12-05T07:48:00Z',
  vehicle: 'Halyard dedicated',
  launchSite: 'Andøya, Norway',
  satellites: 8,
  plane: 'A',
  status: 'operational',
  summary:
    'Filled plane A to sixteen satellites and halved the wait between morning passes.'
} satisfies Mission;

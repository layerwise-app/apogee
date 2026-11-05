import type { Mission } from '../missions';

export default {
  id: 'AO-4',
  launchAt: '2024-10-22T16:31:00Z',
  vehicle: 'Kestrel 2 rideshare',
  launchSite: 'Vandenberg, California',
  satellites: 16,
  plane: 'B',
  status: 'operational',
  summary:
    'Sixteen satellites opened the midday plane, adding a second daily look at every site.'
} satisfies Mission;

import type { Site } from '../sites';

export default {
  id: 'miami-beach',
  /** Position in lists; lower comes first. */
  order: 6,
  name: 'Miami Beach',
  region: 'Florida, United States',
  lat: 25.8,
  lon: -80.13,
  kind: 'city',
  subject: 'Coastal city',
  caption:
    'Storm surge pushes sand across the beachfront blocks and leaves water standing in the low streets by the bay.',
  before: 'Before the storm',
  after: 'Morning after landfall',
  sceneWidthKm: 1.9,
  seed: 67,
  cloudPercent: 12,
  focus: [0.8, 0.5]
} satisfies Site;

import type { Site } from '../sites';

export default {
  id: 'maasvlakte',
  /** Position in lists; lower comes first. */
  order: 3,
  name: 'Maasvlakte',
  region: 'Rotterdam, Netherlands',
  lat: 51.96,
  lon: 4.03,
  kind: 'port',
  subject: 'Container port',
  caption:
    'A new berth comes into service; ships alongside and container stacks are countable from one pass.',
  before: 'March',
  after: 'Today',
  sceneWidthKm: 1.2,
  seed: 37,
  cloudPercent: 3,
  focus: [0.3, 0.34]
} satisfies Site;

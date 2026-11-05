import type { Site } from '../sites';

export default {
  id: 'mekong-delta',
  /** Position in lists; lower comes first. */
  order: 1,
  name: 'Mekong Delta',
  region: 'Bến Tre, Vietnam',
  lat: 10.18,
  lon: 106.42,
  kind: 'delta',
  subject: 'River delta after a flood',
  caption:
    'Distributary channels burst their banks across rice paddies; the villages on the levees stay dry.',
  before: 'Dry season',
  after: 'Two days after the crest',
  sceneWidthKm: 4.2,
  seed: 11,
  cloudPercent: 7,
  focus: [0.5, 0.42]
} satisfies Site;

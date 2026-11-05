import type { Site } from '../sites';

export default {
  id: 'okanagan',
  /** Position in lists; lower comes first. */
  order: 4,
  name: 'Okanagan Highlands',
  region: 'British Columbia, Canada',
  lat: 50.04,
  lon: -119.28,
  kind: 'burn',
  subject: 'Wildfire burn scar',
  caption:
    'The burn perimeter runs up the ridges; unburned islands and the fire break along the road stay green.',
  before: 'Before the fire',
  after: 'Ten days after containment',
  sceneWidthKm: 5.5,
  seed: 41,
  cloudPercent: 2,
  focus: [0.55, 0.42]
} satisfies Site;

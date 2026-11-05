import type { Site } from '../sites';

export default {
  id: 'cote-de-beaune',
  /** Position in lists; lower comes first. */
  order: 2,
  name: 'Côte de Beaune',
  region: 'Burgundy, France',
  lat: 47.02,
  lon: 4.82,
  kind: 'vineyard',
  subject: 'Vineyard region in late summer',
  caption:
    'By late August the grass between parcels has dried out, and the infrared picks out one block of vines under water stress.',
  before: 'Early June',
  after: 'Late August',
  sceneWidthKm: 1.6,
  seed: 23,
  cloudPercent: 0,
  focus: [0.62, 0.46]
} satisfies Site;

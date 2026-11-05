import type { Site } from '../sites';

export default {
  id: 'atacama',
  /** Position in lists; lower comes first. */
  order: 5,
  name: 'Atacama',
  region: 'Antofagasta Region, Chile',
  lat: -24.26,
  lon: -69.07,
  kind: 'mine',
  subject: 'Open-pit mine',
  caption:
    'A year of digging adds two benches to the pit and pushes the waste dump east across the haul road.',
  before: 'One year ago',
  after: 'Today',
  sceneWidthKm: 4.8,
  seed: 53,
  cloudPercent: 0,
  focus: [0.46, 0.5]
} satisfies Site;

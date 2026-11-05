/**
 * Copy for the Imagery page: products, the specification table, and the
 * gallery introduction. The gallery itself shows every site in
 * src/content/sites/.
 */

export const imageryIntro = {
  label: 'Imagery',
  title: 'Pictures you can act on.',
  body: 'Four ways to get Apogee imagery, from a standing order over the places you watch to a single picture of a place you have never looked at before. Every product comes from the same 48 satellites and the same eight-band sensor.'
};

export type Product = {
  id: string;
  name: string;
  summary: string;
  details: string[];
  /** A short spec line shown in mono, like "Daily · 25 km² minimum". */
  readout: string;
};

export const products: Product[] = [
  {
    id: 'daily-monitoring',
    name: 'Daily monitoring',
    summary:
      'A standing order over the areas you watch. Each clear day you get a fresh capture, cloud-masked and aligned to the one before.',
    details: [
      'Areas from 25 km² to whole regions',
      'Change alerts by email or webhook',
      'Pixel-aligned stacks for time series'
    ],
    readout: 'Daily · from 25 km²'
  },
  {
    id: 'tasking',
    name: 'Tasking',
    summary:
      'Point a satellite at a place and a time window. The scheduler picks the first daylight pass and tells you when it will happen.',
    details: [
      'Standard, priority, and rush tiers',
      'Off-nadir up to 20° for sharper pictures',
      'Delivered under 90 minutes after capture'
    ],
    readout: 'Next pass in hours, not days'
  },
  {
    id: 'archive',
    name: 'Archive access',
    summary:
      'Every picture the constellation has taken since July 2023, searchable by place, date, cloud cover, and viewing angle.',
    details: [
      'STAC API search and bulk export',
      'Same-day archive for every capture',
      'Licensed per area, not per image'
    ],
    readout: 'Since 2023 · searchable'
  },
  {
    id: 'analytics',
    name: 'Analytics feeds',
    summary:
      'Numbers instead of pictures, computed from every new capture and delivered as tables your systems can read.',
    details: [
      'Vegetation health (NDVI and red edge)',
      'Flood extent and burn severity',
      'Ship, aircraft, and vehicle counts'
    ],
    readout: 'GeoJSON · CSV · Parquet'
  }
];

export type SpecRow = { label: string; value: string; note?: string };

export const specs: { title: string; rows: SpecRow[] } = {
  title: 'Specifications',
  rows: [
    {
      label: 'Resolution',
      value: '50 cm panchromatic, 2 m multispectral',
      note: 'Ground sample distance at nadir'
    },
    {
      label: 'Spectral bands',
      value:
        'Coastal blue 400–450 nm, blue 450–510, green 510–580, yellow 585–625, red 630–690, red edge 705–745, near-infrared 770–895, near-infrared 860–1040',
      note: 'Eight bands plus panchromatic 450–800 nm'
    },
    {
      label: 'Revisit',
      value: 'Up to 12 times a day',
      note: 'Daily everywhere between 75° N and 75° S'
    },
    {
      label: 'Orbit',
      value: '525 km sun-synchronous, three planes',
      note: 'Descending nodes at 10:30, 12:00, and 13:30 local time'
    },
    { label: 'Scene size', value: '12 km swath, strips up to 120 km long' },
    { label: 'Geolocation', value: 'Under 5 m CE90 without ground control' },
    { label: 'Dynamic range', value: '12 bits per pixel' },
    {
      label: 'Delivery formats',
      value: 'Cloud-optimized GeoTIFF, JPEG 2000, PNG preview',
      note: 'STAC API, OGC WMTS, or a cloud bucket you own'
    },
    { label: 'Latency', value: 'Under 90 minutes from capture to delivery' }
  ]
};

export const gallery = {
  label: 'Sample captures',
  /** `{count}` becomes the number of sites, spelled out: "Six places, captured." */
  title: '{count} places, captured.',
  body: 'Drawn from the same simulation as the tasking demo. Drag the divider to compare before and after, and switch to false color to see vegetation health.'
};

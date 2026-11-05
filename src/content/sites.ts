/**
 * Preset sites for the tasking demo, the Imagery gallery, and the "Who uses
 * it" crops. Each site is one file in src/content/sites/, named after its id.
 * Copy one to add a site; it appears in every list on its own. Each capture
 * is drawn in code from `kind` and `seed` (see src/components/capture/), so
 * the same site always looks the same.
 */

export type SiteKind = 'delta' | 'vineyard' | 'port' | 'burn' | 'mine' | 'city';

export type Site = {
  /** Lowercase with dashes, like "mekong-delta". Also the file name. */
  id: string;
  /** Position in lists; lower comes first. Custom globe targets have none. */
  order?: number;
  name: string;
  region: string;
  lat: number;
  lon: number;
  kind: SiteKind;
  /** What the capture shows, in a few words. */
  subject: string;
  /** One sentence for the gallery and the capture viewer. */
  caption: string;
  /** Labels for the two sides of the before/after slider. */
  before: string;
  after: string;
  /** Width of the scene on the ground, km. Sets the scale bar. */
  sceneWidthKm: number;
  /** Changes the drawn details while keeping the same kind of place. */
  seed: number;
  /** Cloud cover reported in the capture metadata, %. */
  cloudPercent: number;
  /** Where crops of this capture centre, as fractions of width and height. */
  focus: [number, number];
};

const files = import.meta.glob<{ default: Site }>('./sites/*.ts', { eager: true });

/** Every preset site, in `order`. */
export const sites: Site[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export function getSite(id: string) {
  return sites.find((s) => s.id === id);
}

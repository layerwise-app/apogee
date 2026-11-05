import manifest from '~/content/images.json';

/**
 * Images added with `pnpm add-images`. Each has WebP files at up to three
 * widths (800, 1600, 2880; never wider than the original), its size, and a
 * tiny blurred placeholder shown while it loads.
 */
export type ImageEntry = {
  width: number;
  height: number;
  /** data: URL of a ~16 px blurred preview. */
  blur: string;
  /** WebP files by width, smallest first. GIFs have one entry, untouched. */
  sources: { width: number; src: string }[];
  type: 'image/webp' | 'image/gif';
};

export const images = manifest as Record<string, ImageEntry>;

export function getImage(name: string): ImageEntry | undefined {
  return images[name];
}

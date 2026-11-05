/**
 * Product screens are drawn in code from the sample data. To show a real
 * screenshot or video instead, add an override here keyed by the screen's id.
 *
 * Images: run `pnpm add-images path/to/file.png` first; it prints the name to
 * use (the file name without extension). Videos: put an .mp4 in
 * public/videos/ and reference it by path.
 *
 * Example:
 *   'tasking-console': { type: 'image', image: 'tasking-screenshot', alt: 'The tasking console' },
 *   'hero-globe': { type: 'video', src: '/videos/constellation.mp4', poster: 'constellation-poster', alt: 'The constellation' },
 */

/**
 * Every drawn screen on the site:
 *
 * - `hero-globe`: the live globe in the home hero.
 * - `tasking-console`: the home tasking section (globe, site list, viewer).
 * - `constellation-timeline`: the launch-to-first-light sequence on home.
 * - `capture-<site id>`, like `capture-maasvlakte`: that site's capture in
 *   the Imagery gallery and the "Who uses it" crops.
 */
export type ScreenId =
  | 'hero-globe'
  | 'tasking-console'
  | 'constellation-timeline'
  | `capture-${string}`;

export type ScreenOverride =
  | { type: 'image'; image: string; alt: string }
  | { type: 'video'; src: string; poster?: string; alt: string };

export const screens: Partial<Record<ScreenId, ScreenOverride>> = {};

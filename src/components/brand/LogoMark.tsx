/**
 * The Apogee mark: an open apex with the satellite at its highest point,
 * above the horizon. Same drawing as public/logo.svg, without the tile.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox='4 6 56 54' aria-hidden='true' focusable='false' className={className}>
      <path d='M10 50 H16.3 L30 26 H23.7 Z M54 50 H47.7 L34 26 H40.3 Z' fill='currentColor' />
      <circle cx='32' cy='14.5' r='5.25' fill='var(--apg-accent, #ffb547)' />
      <rect x='8' y='54' width='48' height='2' fill='currentColor' opacity='0.55' />
    </svg>
  );
}

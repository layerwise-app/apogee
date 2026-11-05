import type * as React from 'react';
import { ResponsiveImage } from '~/components/ResponsiveImage';
import { useReducedMotion } from '~/components/globe/useGlobe';
import { getImage } from '~/lib/images';
import type { ScreenId } from '~/content/screens';
import { screens } from '~/content/screens';

/**
 * A slot for a product screen. Shows the drawn component (`children`) unless
 * src/content/screens.ts has an image or video override for this id. The
 * slot keeps the drawn screen's box, so a replacement never shifts layout.
 */
export function Screen({
  id,
  children,
  className = '',
  sizes
}: {
  id: ScreenId;
  children: React.ReactNode;
  className?: string;
  sizes?: string;
}) {
  const override = screens[id];
  const reduced = useReducedMotion();
  if (!override) return <>{children}</>;
  if (override.type === 'image') {
    return (
      <div className={`relative overflow-hidden bg-surface ${className}`} data-screen={id}>
        <ResponsiveImage name={override.image} alt={override.alt} sizes={sizes} />
      </div>
    );
  }
  const poster = override.poster ? getImage(override.poster) : undefined;
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`} data-screen={id}>
      <video
        src={override.src}
        poster={poster?.sources[poster.sources.length - 1].src}
        aria-label={override.alt}
        className='h-full w-full object-cover'
        autoPlay={!reduced}
        controls={reduced}
        muted
        loop
        playsInline
        preload='metadata'
      />
    </div>
  );
}

/** True when a screen has been replaced by an image or video. */
export function isScreenReplaced(id: ScreenId) {
  return Boolean(screens[id]);
}

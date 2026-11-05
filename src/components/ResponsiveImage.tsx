import { getImage } from '~/lib/images';

/** An image from src/content/images.json with srcset, size, and a blur placeholder. */
export function ResponsiveImage({
  name,
  alt,
  sizes = '100vw',
  className = '',
  priority = false
}: {
  name: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const img = getImage(name);
  if (!img) {
    if (import.meta.env.DEV) console.warn(`Image "${name}" is not in src/content/images.json`);
    return null;
  }
  const largest = img.sources[img.sources.length - 1];
  return (
    <img
      src={largest.src}
      srcSet={img.type === 'image/gif' ? undefined : img.sources.map((s) => `${s.src} ${s.width}w`).join(', ')}
      sizes={img.type === 'image/gif' ? undefined : sizes}
      width={img.width}
      height={img.height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding='async'
      className={`h-full w-full object-cover ${className}`}
      style={{ backgroundImage: `url(${img.blur})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    />
  );
}

import Image from 'next/image';

/**
 * The website's cover photo, served by the API (decision 0018). Fills its
 * parent, which sets the size and shape. Decorative: the names beside it
 * say whose wedding it is.
 */
export function CoverImage({ src, className = '' }: { src: string; className?: string }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      sizes="100vw"
      className={`object-cover ${className}`}
    />
  );
}

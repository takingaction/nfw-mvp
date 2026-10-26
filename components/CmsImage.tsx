import { getImageProps } from "next/image";
import type { CSSProperties, ReactEventHandler } from "react";

/**
 * Drop-in replacement for a plain <img> showing a CMS (Supabase Storage) image.
 *
 * Images in public Supabase buckets are routed through Next's image optimizer,
 * so visitors get a resized AVIF/WebP for their screen instead of the original
 * upload, and Supabase only serves each source file to Vercel's cache rather
 * than to every visitor. It renders a normal <img> (via getImageProps) with no
 * width/height, so existing CSS sizing behaves exactly as before.
 *
 * Anything else (other hosts, relative paths, SVG, GIF) renders unchanged.
 */
const OPTIMIZABLE_SRC =
  /^https:\/\/([a-z0-9-]+\.supabase\.co|auth\.nationalfundforwomen\.org)\/storage\/v1\/object\/public\/.+\.(jpe?g|png|webp)(\?.*)?$/i;

type Props = {
  src: string;
  alt?: string;
  /** Rendered width hint for srcset selection, e.g. "(min-width: 768px) 33vw, 100vw". */
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  /** Above-the-fold images: load eagerly with high priority. */
  priority?: boolean;
  onError?: ReactEventHandler<HTMLImageElement>;
};

export default function CmsImage({
  src,
  alt = "",
  sizes = "100vw",
  className,
  style,
  priority = false,
  onError,
}: Props) {
  if (!OPTIMIZABLE_SRC.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} onError={onError} />;
  }

  const { props } = getImageProps({ src, alt, width: 2000, height: 2000, sizes, quality: 75, priority });
  // Drop the width/height/style getImageProps adds so the caller's CSS alone sizes the image.
  const imgProps: Partial<typeof props> = { ...props };
  delete imgProps.width;
  delete imgProps.height;
  delete imgProps.style;

  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...imgProps} className={className} style={style} onError={onError} />;
}

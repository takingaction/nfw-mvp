import sharp from "sharp";

/**
 * Server-side normalisation for CMS image uploads (page-builder bucket).
 *
 * Every JPEG/PNG/WebP is auto-rotated, capped at MAX_EDGE on its longest side
 * and re-encoded in its ORIGINAL format. Images uploaded straight from a camera
 * or Unsplash (4-6000px, 2-8 MB) were the main source of Supabase storage
 * egress; after this they land at a few hundred KB.
 *
 * Format is deliberately kept: this bucket also feeds the email builder, and
 * Outlook for Windows does not render WebP. Website visitors still get WebP,
 * because pages render these through Next's image optimizer (CmsImage).
 * GIF (may be animated) and SVG (vector) pass through untouched.
 */
export const MAX_EDGE = 2000;

export function isOptimizableImage(mimeType: string): boolean {
  return mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp";
}

export async function optimizeImageUpload(input: Buffer, mimeType: string): Promise<Buffer> {
  const img = sharp(input, { failOn: "none" })
    .rotate() // apply EXIF orientation, then metadata is dropped
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  if (mimeType === "image/jpeg") return img.jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();
  if (mimeType === "image/png") return img.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10, dither: 1 }).toBuffer();
  return img.webp({ quality: 80, effort: 5 }).toBuffer();
}

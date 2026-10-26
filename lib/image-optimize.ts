import sharp from "sharp";

/**
 * Server-side normalisation for CMS image uploads (page-builder bucket).
 *
 * Every JPEG/PNG/WebP is auto-rotated, capped at MAX_EDGE on its longest side
 * and re-encoded as WebP. Images uploaded straight from a camera or Unsplash
 * (4-6000px, 2-8 MB) were the main source of Supabase storage egress; after
 * this they land at a few hundred KB. GIF (may be animated) and SVG (vector)
 * pass through untouched.
 */
export const MAX_EDGE = 2000;
const OPTIMIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isOptimizableImage(mimeType: string): boolean {
  return OPTIMIZABLE.has(mimeType);
}

export async function optimizeImageUpload(
  input: Buffer,
): Promise<{ buffer: Buffer; contentType: "image/webp"; ext: "webp" }> {
  const buffer = await sharp(input, { failOn: "none" })
    .rotate() // apply EXIF orientation, then metadata is dropped
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer();
  return { buffer, contentType: "image/webp", ext: "webp" };
}

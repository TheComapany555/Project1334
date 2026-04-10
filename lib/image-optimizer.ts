import sharp from "sharp";

/** Optimize an image buffer: resize + JPEG compress. */
export async function optimizeImage(
  buffer: Buffer,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<{ buffer: Buffer; contentType: string }> {
  const maxWidth = options?.maxWidth ?? 1600;
  const quality = options?.quality ?? 80;

  try {
    const optimized = await sharp(buffer)
      .resize(maxWidth, options?.maxHeight ?? undefined, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    return { buffer: optimized, contentType: "image/jpeg" };
  } catch {
    // Fallback: return original
    return { buffer, contentType: "image/jpeg" };
  }
}

/** Optimize a logo/avatar: smaller size, preserve transparency with WebP or compress as JPEG. */
export async function optimizeLogo(
  buffer: Buffer,
  options?: { maxWidth?: number; quality?: number }
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const maxWidth = options?.maxWidth ?? 400;
  const quality = options?.quality ?? 85;

  try {
    const optimized = await sharp(buffer)
      .resize(maxWidth, maxWidth, { withoutEnlargement: true, fit: "inside" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    return { buffer: optimized, contentType: "image/jpeg", ext: "jpg" };
  } catch {
    return { buffer, contentType: "image/jpeg", ext: "jpg" };
  }
}

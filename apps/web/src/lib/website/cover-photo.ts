/** The longest side a cover photo is uploaded at: sharp on a wide screen, small to download. */
const LONGEST_SIDE = 2400;

/**
 * Shrinks a photo in the browser before it is uploaded (decision 0018), so
 * guests on phones don't download a 12 MB original. Always a JPEG. Throws
 * when the browser can't read the file as an image.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas');
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))),
        'image/jpeg',
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
}

/** The draft's cover, for the wedding's members (the API's image route). */
export function draftCoverPath(weddingId: string, imageId: string): string {
  return `/api/v1/weddings/${encodeURIComponent(weddingId)}/website/images/${encodeURIComponent(imageId)}`;
}

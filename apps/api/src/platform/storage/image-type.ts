/** The photo formats the product accepts (decisions 0018 and 0019). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** File extension for each accepted format. */
export const IMAGE_EXTENSIONS: Record<ImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** What a file really is, from its first bytes; never from its name or declared type. */
export function imageTypeOf(start: Uint8Array): ImageType | null {
  const at = (offset: number, bytes: number[]) =>
    bytes.every((byte, index) => start[offset + index] === byte);
  if (at(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  return null;
}

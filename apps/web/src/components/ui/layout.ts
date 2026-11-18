const gutter = 'mx-auto w-full px-5 md:px-10';

/** Page-width container used by every section: 1240px max, design margins. */
export const container = `${gutter} max-w-[1240px]`;

/**
 * Reading-width container for long-form text such as the legal pages. A
 * separate constant rather than `container` plus another max-width: when two
 * utilities set the same property, Tailwind's stylesheet order decides which
 * applies, not the order of the classes.
 */
export const readingContainer = `${gutter} max-w-3xl`;

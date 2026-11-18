import type { ReactNode } from 'react';

const WIDTHS = {
  default: 'max-w-2xl',
  narrow: 'max-w-xl',
} as const;

interface SectionHeadingProps {
  eyebrow: string;
  /** Plain part of the heading. */
  title: string;
  /** Italic serif continuation, in the accent colour. */
  accent: string;
  intro?: ReactNode;
  align?: 'left' | 'center';
  width?: keyof typeof WIDTHS;
  /** Used by the section's aria-labelledby. */
  id?: string;
  /**
   * Spacing only (margins). Width and alignment have their own props: a
   * class that conflicts with them is not reliably applied, because
   * Tailwind's stylesheet order decides, not class order.
   */
  className?: string;
}

/** The eyebrow + two-tone heading + intro pattern used by every section. */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  intro,
  align = 'left',
  width = 'default',
  id,
  className = '',
}: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <div className={`${WIDTHS[width]} ${centered ? 'mx-auto text-center' : ''} ${className}`}>
      <p className="mb-3 text-label-sm font-semibold tracking-widest text-secondary uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="font-serif text-headline-lg-mobile text-on-surface md:text-headline-lg"
      >
        {title} <span className="text-primary italic">{accent}</span>
      </h2>
      {intro ? <p className="mt-4 text-body-lg text-on-surface-variant">{intro}</p> : null}
    </div>
  );
}

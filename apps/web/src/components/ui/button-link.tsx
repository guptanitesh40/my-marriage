import Link from 'next/link';
import type { ComponentProps } from 'react';

const VARIANTS = {
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-container',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  // For use on the dark primary background.
  gold: 'bg-secondary-fixed text-on-secondary-fixed shadow-md hover:bg-secondary-fixed-dim',
} as const;

const SIZES = {
  md: 'px-6 py-2.5',
  lg: 'px-7 py-3.5',
  xl: 'px-8 py-4',
} as const;

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /**
   * Layout only (width, margins). Do not pass padding, colour or typography:
   * a class that conflicts with the variant or size is not reliably applied,
   * because Tailwind's stylesheet order decides, not class order. Add a
   * variant or size instead.
   */
  className?: string;
};

/** A link styled as a button. Navigation only — never use it for actions. */
export function ButtonLink({
  variant = 'primary',
  size = 'lg',
  className = '',
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center justify-center rounded-md text-label-md font-semibold transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

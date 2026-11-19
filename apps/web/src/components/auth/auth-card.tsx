import type { ReactNode } from 'react';

/** The centred card every sign-in, signup and recovery screen uses (docs/design/login). */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="w-full max-w-[460px] rounded-lg border border-surface-container-highest bg-surface-container-lowest px-6 py-9 shadow-sm sm:px-10 sm:py-10">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-headline-lg-mobile text-on-surface sm:text-headline-md">
          {title}
        </h1>
        {description && (
          <div className="mt-2 text-body-md text-on-surface-variant">{description}</div>
        )}
      </header>
      {children}
      {footer && (
        <footer className="mt-8 border-t border-surface-container-highest pt-6 text-center text-body-sm text-on-surface-variant">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** A link inside an auth card: primary colour, underlined on hover. */
export const authLinkClass =
  'rounded-sm font-semibold text-primary underline-offset-4 hover:underline';

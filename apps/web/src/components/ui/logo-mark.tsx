// The brand mark from the Stitch project ("My Marriage Brand Logo",
// docs/design/brand/logo.svg): two interlocking rings. Inline so it renders
// with the page, without an extra request, and coloured from the design
// tokens so it follows them. app/icon.svg is a static copy with the same
// values written out; update it if these tokens change.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="10" className="fill-primary-container" />
      <circle
        cx="16"
        cy="20"
        r="8"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="stroke-surface"
      />
      <circle
        cx="24"
        cy="20"
        r="8"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="stroke-brand-gold"
      />
      <path
        d="M20 14.5V25.5"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.8"
        className="stroke-surface"
      />
      <circle cx="20" cy="12" r="1.5" className="fill-brand-gold" />
    </svg>
  );
}

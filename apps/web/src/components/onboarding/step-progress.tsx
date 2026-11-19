export const ONBOARDING_STEPS = 3;

/**
 * "Step 1 of 3 · Your wedding" with a progress bar, as in the Stitch
 * onboarding design. The text says it all; the bar is decoration.
 */
export function StepProgress({
  step,
  title,
  aside,
}: {
  step: 1 | 2 | 3;
  title: string;
  /** At the right, e.g. "Optional". */
  aside?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-label-sm font-semibold tracking-wider text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Step {step} of {ONBOARDING_STEPS} · {title}
        </p>
        {aside && <span className="text-label-sm font-medium text-secondary">{aside}</span>}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface-container-high"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(step / ONBOARDING_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** The editorial heading above each step's card. */
export function StepHeading({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">{intro}</p>
    </div>
  );
}

export const stepCardClass =
  'relative flex flex-col gap-6 overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-md sm:p-9';

/**
 * While a step asks the API who is visiting — usually a fraction of a
 * second. Announced to screen readers but not shown, so the step simply
 * appears instead of flashing a "Loading" line first.
 */
export function StepLoading() {
  return (
    <p role="status" className="sr-only">
      Loading…
    </p>
  );
}

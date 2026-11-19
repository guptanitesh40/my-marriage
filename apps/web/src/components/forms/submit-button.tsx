import type { ReactNode } from 'react';

/**
 * The form's main button. While the request runs it is disabled (so a
 * double click cannot submit twice), shows a spinner and says what is
 * happening.
 */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-wait disabled:bg-primary-container"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
        />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}

import type { ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

export const inputClass =
  'w-full rounded-md border bg-surface-container-lowest px-3.5 py-2.5 text-body-md text-on-surface ' +
  'placeholder:text-on-surface-variant/70 transition-colors hover:border-outline ' +
  'focus:border-primary-container focus:outline-2 focus:outline-offset-0 focus:outline-primary-container ' +
  'aria-[invalid=true]:border-error';

export interface FieldProps {
  id: string;
  label: string;
  /** Shown below the input and announced with it, e.g. password rules. */
  hint?: string;
  /** Replaces nothing: shown in addition to the hint, and marks the input invalid. */
  error?: string;
  /** Beside the label, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
}

/** The ids an input should reference in `aria-describedby`. */
export function describedBy({ id, hint, error }: FieldProps): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** Label, hint and error around any input. */
export function FieldFrame(props: FieldProps & { children: ReactNode }) {
  const { id, label, hint, error, labelAside, children } = props;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label-md font-semibold text-on-surface">
          {label}
        </label>
        {labelAside}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-body-sm text-error">
          <Icon name="error" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type TextFieldProps = FieldProps &
  Omit<ComponentProps<'input'>, 'id' | 'className'> & {
    /** Decorative, inside the input at the end, e.g. a map pin for a city. */
    trailingIcon?: IconName;
  };

/** A labelled text input whose hint and error are announced by screen readers. */
export function TextField({
  id,
  label,
  hint,
  error,
  labelAside,
  trailingIcon,
  ...input
}: TextFieldProps) {
  const field = { id, label, hint, error, labelAside };
  const control = (
    <input
      {...input}
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(field)}
      className={`${inputClass} border-outline-variant ${trailingIcon ? 'pr-10' : ''}`}
    />
  );
  return (
    <FieldFrame {...field}>
      {trailingIcon ? (
        <div className="relative">
          {control}
          <Icon
            name={trailingIcon}
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-outline"
          />
        </div>
      ) : (
        control
      )}
    </FieldFrame>
  );
}

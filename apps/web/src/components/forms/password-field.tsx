'use client';

import { useState, type ComponentProps } from 'react';
import { Icon } from '@/components/ui/icon';
import { describedBy, FieldFrame, inputClass, type FieldProps } from './text-field';

type PasswordFieldProps = FieldProps &
  Omit<ComponentProps<'input'>, 'id' | 'className' | 'type'> & {
    autoComplete: 'current-password' | 'new-password';
  };

/**
 * A password input with a show/hide button, so people on phones can check
 * what they typed. The button keeps one label and reports its state with
 * aria-pressed, as a toggle should.
 */
export function PasswordField({
  id,
  label,
  hint,
  error,
  labelAside,
  ...input
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const field = { id, label, hint, error, labelAside };
  return (
    <FieldFrame {...field}>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={visible ? 'text' : 'password'}
          // Shown passwords must not be "corrected" or remembered as text.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(field)}
          className={`${inputClass} border-outline-variant pr-12`}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((shown) => !shown)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name={visible ? 'visibility-off' : 'visibility'} className="size-5" />
          <span className="sr-only">Show password</span>
        </button>
      </div>
    </FieldFrame>
  );
}

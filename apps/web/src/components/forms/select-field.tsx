import type { ComponentProps } from 'react';
import { Icon } from '@/components/ui/icon';
import { describedBy, FieldFrame, inputClass, type FieldProps } from './text-field';

type SelectFieldProps = FieldProps &
  Omit<ComponentProps<'select'>, 'id' | 'className' | 'children'> & {
    /** Each choice, as its label or as a value and the label shown for it. */
    options: readonly (string | { value: string; label: string })[];
    /** The first, empty choice, e.g. "Choose a state"; none when left out. */
    placeholder?: string;
  };

/**
 * A native select styled like the text inputs: the browser's own picker,
 * which is the most usable one on phones and with assistive technology.
 */
export function SelectField({
  id,
  label,
  hint,
  error,
  labelAside,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  const field = { id, label, hint, error, labelAside };
  return (
    <FieldFrame {...field}>
      <div className="relative">
        <select
          {...select}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(field)}
          className={`${inputClass} cursor-pointer appearance-none border-outline-variant pr-10`}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => {
            const { value, label } =
              typeof option === 'string' ? { value: option, label: option } : option;
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
        <Icon
          name="expand-more"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-outline"
        />
      </div>
    </FieldFrame>
  );
}

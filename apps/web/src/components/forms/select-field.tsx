import type { ComponentProps } from 'react';
import { Icon } from '@/components/ui/icon';
import { describedBy, FieldFrame, inputClass, type FieldProps } from './text-field';

type SelectFieldProps = FieldProps &
  Omit<ComponentProps<'select'>, 'id' | 'className' | 'children'> & {
    options: readonly string[];
    /** The first, empty choice, e.g. "Choose a state". */
    placeholder: string;
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
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Icon
          name="expand-more"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-outline"
        />
      </div>
    </FieldFrame>
  );
}

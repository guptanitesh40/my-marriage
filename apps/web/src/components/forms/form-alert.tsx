import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

const TONES = {
  error: {
    box: 'border-error/30 bg-error-container text-on-error-container',
    icon: 'error',
  },
  success: {
    box: 'border-primary-fixed-dim bg-primary-fixed/60 text-on-primary-fixed',
    icon: 'check-circle',
  },
} as const;

/**
 * A message about the whole form. Errors are announced immediately
 * (role="alert"); success politely (role="status").
 */
export function FormAlert({
  tone,
  title,
  children,
  id,
}: {
  tone: keyof typeof TONES;
  title?: string;
  children: ReactNode;
  id?: string;
}) {
  const style = TONES[tone];
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      tabIndex={-1}
      className={`flex gap-3 rounded-md border px-4 py-3 text-body-sm ${style.box}`}
    >
      <Icon name={style.icon} className="mt-0.5 size-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

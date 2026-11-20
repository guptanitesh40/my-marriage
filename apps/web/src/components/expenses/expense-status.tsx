import { Icon, type IconName } from '@/components/ui/icon';
import {
  shownStatus,
  STATUS_LABELS,
  type Expense,
  type ShownStatus,
} from '@/lib/expenses/directory';

const STYLES: Record<ShownStatus, { className: string; icon: IconName }> = {
  unpaid: { className: 'bg-surface-container-high text-on-surface', icon: 'schedule' },
  partially_paid: {
    className: 'bg-secondary-container/70 text-on-secondary-container',
    icon: 'hourglass-top',
  },
  paid: { className: 'bg-primary-fixed text-on-primary-fixed', icon: 'check-circle' },
  overdue: { className: 'bg-error-container text-on-error-container', icon: 'warning' },
};

/** Unpaid, Partially paid, Paid or Overdue: an icon and words, never colour alone. */
export function StatusPill({ expense }: { expense: Pick<Expense, 'status' | 'overdue'> }) {
  const status = shownStatus(expense);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold whitespace-nowrap ${STYLES[status].className}`}
    >
      <Icon name={STYLES[status].icon} className="size-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}

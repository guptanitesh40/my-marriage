import { Icon, type IconName } from '@/components/ui/icon';
import {
  DELIVERY_LABELS,
  RSVP_LABELS,
  type Delivery,
  type RsvpStatus,
} from '@/lib/guests/directory';

const RSVP_STYLES: Record<RsvpStatus, { className: string; icon: IconName }> = {
  pending: { className: 'bg-surface-container-high text-on-surface', icon: 'schedule' },
  attending: { className: 'bg-primary-fixed text-on-primary-fixed', icon: 'check-circle' },
  not_attending: { className: 'bg-error-container text-on-error-container', icon: 'close' },
  maybe: { className: 'bg-secondary-container/70 text-on-secondary-container', icon: 'info' },
};

/** Pending, Attending, Not attending or Maybe: an icon and words, never colour alone. */
export function RsvpChip({ status, children }: { status: RsvpStatus; children?: React.ReactNode }) {
  const style = RSVP_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold whitespace-nowrap ${style.className}`}
    >
      <Icon name={style.icon} className="size-3.5" />
      {children ?? RSVP_LABELS[status]}
    </span>
  );
}

const DELIVERY_STYLES: Record<Delivery, { className: string; icon: IconName }> = {
  not_shared: {
    className: 'bg-surface-container-high text-on-surface-variant',
    icon: 'visibility-off',
  },
  link_ready: { className: 'bg-secondary-container/60 text-on-secondary-container', icon: 'link' },
  email_queued: { className: 'bg-surface-container-high text-on-surface', icon: 'schedule' },
  email_sent: { className: 'bg-primary-fixed text-on-primary-fixed', icon: 'mail' },
  email_failed: { className: 'bg-error-container text-on-error-container', icon: 'error' },
  link_revoked: {
    className: 'bg-surface-container-high text-on-surface-variant',
    icon: 'link-off',
  },
};

export function DeliveryChip({ delivery }: { delivery: Delivery }) {
  const style = DELIVERY_STYLES[delivery];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold whitespace-nowrap ${style.className}`}
    >
      <Icon name={style.icon} className="size-3.5" />
      {DELIVERY_LABELS[delivery]}
    </span>
  );
}

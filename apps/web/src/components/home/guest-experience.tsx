import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { SectionHeading } from '@/components/ui/section-heading';
import { guestExperience, type GuestCardId } from '@/content/home/copy';
import { linkHousehold, photoQueue } from '@/content/home/sample-wedding';

const CARD_VISUALS: Record<GuestCardId, { iconTile: string; snippet: ReactNode }> = {
  'invite-link': { iconTile: 'bg-surface-container text-primary', snippet: <InviteLinkSnippet /> },
  rsvp: { iconTile: 'bg-secondary-container/40 text-secondary', snippet: <RsvpSnippet /> },
  photos: { iconTile: 'bg-primary-fixed/30 text-primary', snippet: <PhotosSnippet /> },
};

export function GuestExperience() {
  return (
    <section
      aria-labelledby="guests-title"
      className="w-full bg-surface-container-low py-20 md:py-28"
    >
      <div className={container}>
        <SectionHeading
          id="guests-title"
          eyebrow={guestExperience.eyebrow}
          title={guestExperience.title}
          accent={guestExperience.accent}
          intro={guestExperience.intro}
          className="mb-16"
        />
        <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {guestExperience.cards.map((card) => (
            <li
              key={card.title}
              className="flex flex-col justify-between rounded-lg bg-surface-container-lowest p-6 shadow-xs"
            >
              <div>
                <div
                  className={`mb-6 flex size-12 items-center justify-center rounded-md text-2xl ${CARD_VISUALS[card.id].iconTile}`}
                >
                  <Icon name={card.icon} />
                </div>
                <h3 className="mb-2 font-serif text-headline-sm text-on-surface">{card.title}</h3>
                <p className="mb-6 text-body-md text-on-surface-variant">{card.body}</p>
              </div>
              <div aria-hidden="true">{CARD_VISUALS[card.id].snippet}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function InviteLinkSnippet() {
  return (
    <div className="rounded-md bg-surface-container-low p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-title-sm font-semibold text-on-surface">
          {linkHousehold.name} · {linkHousehold.partySize}
        </span>
        <span className="text-label-sm font-semibold text-primary">Private link</span>
      </div>
      {/* Invitation links are random tokens: never a guest's name. */}
      <div className="truncate rounded-sm bg-surface-container-lowest p-2 text-[12px] text-on-surface-variant">
        …/invite/t/••••••••••••
      </div>
    </div>
  );
}

function RsvpSnippet() {
  return (
    <div className="space-y-2 rounded-md bg-surface-container-low p-4 text-body-sm">
      {linkHousehold.replies.map((reply) => (
        <div key={reply.ceremony} className="flex items-center justify-between">
          <span className="text-on-surface">{reply.ceremony}</span>
          <span className="flex items-center gap-1 font-semibold text-primary">
            <Icon name="check" className="text-sm" />
            {reply.attending} coming
          </span>
        </div>
      ))}
      {linkHousehold.notInvited.map((ceremony) => (
        <div key={ceremony} className="flex items-center justify-between text-on-surface-variant">
          <span>{ceremony}</span>
          <span>Not invited</span>
        </div>
      ))}
    </div>
  );
}

function PhotosSnippet() {
  return (
    <div className="rounded-md bg-surface-container-low p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-title-sm font-semibold text-on-surface">
          {photoQueue.uploads} uploads
        </span>
        <span className="rounded-sm bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">
          {photoQueue.toReview} to review
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2].map((tile) => (
          <div
            key={tile}
            className="flex h-10 items-center justify-center rounded-sm bg-surface-container-highest text-base text-on-surface-variant"
          >
            <Icon name="image" />
          </div>
        ))}
        <div className="flex h-10 items-center justify-center rounded-sm bg-primary-container text-label-sm font-bold text-on-primary">
          +{photoQueue.uploads - 3}
        </div>
      </div>
    </div>
  );
}

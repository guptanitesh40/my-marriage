import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { readingContainer } from '@/components/ui/layout';

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Layout for the privacy policy and terms. Both are drafts written from the
 * product documents; they must be reviewed by a qualified lawyer (including
 * against India's DPDP Act, 2023) before a public launch, and the notice
 * below removed only then.
 */
export function LegalDocument({ title, lastUpdated, children }: LegalDocumentProps) {
  return (
    <article className={`${readingContainer} py-16 md:py-24`}>
      <h1 className="font-serif text-headline-lg-mobile text-on-surface md:text-headline-lg">
        {title}
      </h1>
      <p className="mt-2 text-body-sm text-on-surface-variant">{lastUpdated}</p>
      <div
        role="note"
        className="mt-6 flex gap-3 rounded-md border border-secondary-container bg-secondary-container/30 p-4 text-body-sm text-on-surface"
      >
        <Icon name="security" className="mt-0.5 shrink-0 text-lg text-secondary" />
        <p>
          <strong className="font-semibold">Draft, pending legal review.</strong> This document
          describes how the product is designed to work during our early pilot. It is not yet a
          final legal agreement, and text in [square brackets] is still to be confirmed.
        </p>
      </div>
      <div className="mt-10 space-y-4 text-body-md text-on-surface-variant [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-headline-sm [&_h2]:text-on-surface [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-on-surface [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}

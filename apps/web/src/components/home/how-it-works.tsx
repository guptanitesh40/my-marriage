import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { SectionHeading } from '@/components/ui/section-heading';
import { howItWorks, type HowItWorksStepId } from '@/content/home/copy';
import { couple, team } from '@/content/home/sample-wedding';
import { homeSections, publicWeddingUrl } from '@/lib/routes';

const STEP_SNIPPETS: Record<HowItWorksStepId, ReactNode> = {
  create: (
    <>
      <span className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed">
          A
        </span>
        <span className="text-title-sm text-on-surface">{couple.names}</span>
      </span>
      <span className="text-label-sm font-semibold text-primary">Created</span>
    </>
  ),
  plan: (
    <>
      <span className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-secondary-fixed text-xs font-bold text-on-secondary-fixed">
          {team.sampleManager.initial}
        </span>
        <span className="text-body-sm font-semibold text-on-surface">
          {team.sampleManager.name}
        </span>
      </span>
      <span className="rounded-sm bg-surface-container-highest px-2 py-0.5 text-label-sm text-secondary">
        Manager
      </span>
    </>
  ),
  share: (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <Icon name="link" className="shrink-0 text-base text-primary" />
        <span className="truncate text-body-sm font-semibold text-primary">
          {publicWeddingUrl(couple.slug)}
        </span>
      </span>
      <span className="size-2 shrink-0 rounded-full bg-primary" />
    </>
  ),
};

export function HowItWorks() {
  return (
    <section
      id={homeSections.howItWorks}
      aria-labelledby="how-title"
      className="w-full bg-surface-container py-20 md:py-28"
    >
      <div className={container}>
        <SectionHeading
          id="how-title"
          eyebrow={howItWorks.eyebrow}
          title={howItWorks.title}
          accent={howItWorks.accent}
          intro={howItWorks.intro}
          width="narrow"
          className="mb-16"
        />
        <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {howItWorks.steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col justify-between rounded-lg bg-surface-container-lowest p-8"
            >
              <div>
                {/* 70% is the palest gold that keeps 3:1 contrast for large text. */}
                <span
                  className="mb-6 block font-serif text-headline-lg text-secondary/70 italic"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mb-3 font-serif text-headline-sm text-on-surface">{step.title}</h3>
                <p className="mb-6 text-body-md text-on-surface-variant">{step.body}</p>
              </div>
              <div
                className="flex items-center justify-between gap-2 rounded-md bg-surface-container-low p-3.5"
                aria-hidden="true"
              >
                {STEP_SNIPPETS[step.id]}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

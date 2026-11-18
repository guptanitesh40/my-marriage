import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { faq, finalCta } from '@/content/home/copy';
import { homeSections, routes } from '@/lib/routes';

/** Final call to action and the FAQ, which share one band in the design. */
export function Closing() {
  return (
    <section className="w-full bg-surface-container py-20 md:py-28">
      <div className={`${container} flex flex-col gap-20`}>
        <div className="relative flex w-full flex-col items-start justify-between gap-8 overflow-hidden rounded-xl bg-primary p-8 text-on-primary shadow-xl md:flex-row md:items-center md:p-14">
          <div
            className="pointer-events-none absolute -top-16 -right-16 size-80 rounded-full bg-secondary-fixed/10"
            aria-hidden="true"
          />
          <div className="relative z-10 max-w-xl">
            <p className="mb-3 text-label-sm font-semibold tracking-widest text-secondary-fixed uppercase">
              {finalCta.eyebrow}
            </p>
            <h2 className="mb-4 font-serif text-headline-lg-mobile text-on-primary md:text-headline-lg">
              {finalCta.title}{' '}
              <span className="text-secondary-fixed italic">{finalCta.accent}</span>
            </h2>
            <p className="text-body-lg text-on-primary-container">{finalCta.intro}</p>
          </div>
          <div className="relative z-10 w-full sm:w-auto">
            <ButtonLink href={routes.login} variant="gold" size="xl" className="w-full sm:w-auto">
              {finalCta.cta}
            </ButtonLink>
          </div>
        </div>

        <div id={homeSections.faq} className="mx-auto w-full max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
              {faq.eyebrow}
            </p>
            <h2 className="font-serif text-headline-md text-on-surface">{faq.title}</h2>
          </div>
          {/* Native disclosure widgets: keyboard accessible without JavaScript.
              A shared `name` makes them exclusive — opening one closes the others. */}
          <div className="space-y-4">
            {faq.items.map((item) => (
              <details
                key={item.question}
                name="faq"
                className="group overflow-hidden rounded-md bg-surface-container-lowest shadow-xs"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-title-sm font-semibold text-on-surface [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <Icon
                    name="expand-more"
                    className="shrink-0 text-xl text-on-surface-variant transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="px-6 pt-1 pb-4 text-body-md text-on-surface-variant">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { SectionHeading } from '@/components/ui/section-heading';
import { trust } from '@/content/home/copy';

export function Trust() {
  return (
    <section aria-labelledby="trust-title" className={`${container} py-20 md:py-28`}>
      <SectionHeading
        id="trust-title"
        align="center"
        eyebrow={trust.eyebrow}
        title={trust.title}
        accent={trust.accent}
        intro={trust.intro}
        className="mb-16"
      />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trust.items.map((item) => (
          <li
            key={item.title}
            className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-6"
          >
            <div className="flex size-8 items-center justify-center rounded-base bg-surface-container-lowest text-xl text-primary">
              <Icon name={item.icon} />
            </div>
            <h3 className="text-title-sm font-semibold text-on-surface">{item.title}</h3>
            <p className="text-body-sm leading-relaxed text-on-surface-variant">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

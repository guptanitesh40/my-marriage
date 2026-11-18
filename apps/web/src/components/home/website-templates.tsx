import { Icon, type IconName } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { SectionHeading } from '@/components/ui/section-heading';
import { weddingWebsites } from '@/content/home/copy';
import { ceremonies, couple } from '@/content/home/sample-wedding';
import { homeSections } from '@/lib/routes';

type TemplateId = (typeof weddingWebsites.templates)[number]['id'];

const LOOK: Record<TemplateId, { card: string; style: string; badge: string; icon: IconName }> = {
  traditional: {
    card: 'bg-surface-container-low',
    style: 'text-secondary',
    badge: 'bg-secondary-container text-on-secondary-container',
    icon: 'auto-awesome',
  },
  modern: {
    card: 'bg-surface-container-lowest',
    style: 'text-primary',
    badge: 'bg-surface-container text-on-surface',
    icon: 'design-services',
  },
  royal: {
    card: 'bg-primary text-on-primary',
    style: 'text-secondary-fixed',
    badge: 'bg-primary-container text-secondary-fixed',
    icon: 'stars',
  },
};

export function WebsiteTemplates() {
  return (
    <section
      id={homeSections.weddingWebsites}
      aria-labelledby="websites-title"
      className={`${container} py-20 md:py-28`}
    >
      <SectionHeading
        id="websites-title"
        eyebrow={weddingWebsites.eyebrow}
        title={weddingWebsites.title}
        accent={weddingWebsites.accent}
        intro={weddingWebsites.intro}
        className="mb-16"
      />
      <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {weddingWebsites.templates.map((template) => {
          const look = LOOK[template.id];
          return (
            <li key={template.id} className="group flex flex-col">
              <div
                role="img"
                aria-label={`Preview of the ${template.name} wedding website template`}
                className={`relative flex h-80 w-full flex-col justify-between overflow-hidden rounded-lg p-6 shadow-sm transition-shadow group-hover:shadow-md ${look.card}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-label-sm font-semibold tracking-widest uppercase ${look.style}`}
                  >
                    {template.style}
                  </span>
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-sm ${look.badge}`}
                  >
                    <Icon name={look.icon} />
                  </span>
                </div>
                <TemplatePreview id={template.id} />
              </div>
              <h3 className="mt-4 text-title-sm font-semibold text-on-surface">{template.name}</h3>
              <p className="text-body-sm text-on-surface-variant">{template.description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What each template's home page shows. Public sites never show RSVP or guest data. */
function TemplatePreview({ id }: { id: TemplateId }) {
  if (id === 'traditional') {
    return (
      <>
        <div className="my-auto py-6 text-center">
          <span className="mb-2 block text-label-sm tracking-widest text-on-surface-variant uppercase">
            Together with their families
          </span>
          <div className="mb-2 font-serif text-headline-md text-on-surface italic">
            {couple.names}
          </div>
          <div className="text-body-sm text-secondary">Palace Gardens · {couple.city}</div>
        </div>
        <div className="flex items-center justify-center gap-4 text-label-sm text-on-surface-variant">
          <span>Ceremonies</span>
          <span>·</span>
          <span>Venues</span>
          <span>·</span>
          <span>Gallery</span>
        </div>
      </>
    );
  }
  if (id === 'modern') {
    return (
      <>
        <div className="my-auto py-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-container-high font-serif text-lg font-bold text-on-surface italic">
            A+A
          </div>
          <div className="mb-1 font-serif text-headline-md font-medium tracking-tight text-on-surface uppercase">
            {couple.names}
          </div>
          <div className="text-label-sm tracking-wider text-on-surface-variant uppercase">
            {couple.city} · December 2027
          </div>
        </div>
        <div className="flex items-center justify-between rounded-base bg-surface-container px-3 py-2 text-label-sm">
          <span className="text-on-surface">{ceremonies.length} ceremonies</span>
          <span className="font-semibold text-primary">View schedule</span>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="my-auto py-6 text-center">
        <span className="mb-1.5 block text-label-sm tracking-widest text-primary-fixed uppercase">
          Celebrate the union of
        </span>
        <div className="mb-2 font-serif text-headline-md text-on-primary italic">
          {couple.names}
        </div>
        <div className="text-body-sm text-secondary-fixed">December 10 to 14 · {couple.city}</div>
      </div>
      <div className="flex items-center justify-center gap-2 rounded-base bg-primary-container p-2.5 text-label-sm font-semibold text-secondary-fixed">
        <Icon name="live-tv" className="text-base" />
        Watch the wedding live
      </div>
    </>
  );
}

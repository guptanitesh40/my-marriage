'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { TEMPLATES, templateLabel, type TemplateId } from '@/lib/website/templates';

/**
 * The three templates (Stitch "Appearance & Styles"). Choosing one saves
 * the draft's template only: every word and ceremony stays as it is, and
 * a published site keeps its design until the changes are published.
 */
export function ThemePicker({
  weddingId,
  templateId,
  contentVersion,
  publishedTemplateId,
  writable,
}: {
  weddingId: string;
  templateId: TemplateId;
  contentVersion: number;
  publishedTemplateId?: TemplateId;
  writable: boolean;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState(templateId);
  const [version, setVersion] = useState(contentVersion);
  const [saving, setSaving] = useState<TemplateId | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  async function choose(id: TemplateId) {
    if (!writable || saving || id === chosen) return;
    const previous = chosen;
    setChosen(id);
    setSaving(id);
    setAlert(null);
    try {
      const { data, error, response } = await api.PATCH('/api/v1/weddings/{weddingId}/website', {
        params: { path: { weddingId } },
        body: { templateId: id, contentVersion: version },
      });
      if (data) {
        setVersion(data.data.contentVersion);
        router.refresh();
      } else {
        setChosen(previous);
        const failure = toFailure(response.status, error);
        setAlert(failure.message);
        if (failure.code === 'WEBSITE_VERSION_CONFLICT' || failure.code === 'WEDDING_ARCHIVED') {
          router.refresh();
        }
      }
    } catch {
      setChosen(previous);
      setAlert(networkFailure().message);
    }
    setSaving(null);
  }

  return (
    <section
      aria-labelledby="website-design-heading"
      className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-xs sm:p-6"
    >
      <div>
        <h2 id="website-design-heading" className="font-serif text-headline-sm text-on-surface">
          Website design
        </h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Choose the look of your website. All three show exactly the same content.
        </p>
      </div>
      {alert && (
        <FormAlert tone="error" title="The design wasn’t changed">
          {alert}
        </FormAlert>
      )}
      <fieldset disabled={!writable} className="grid gap-3 md:grid-cols-3">
        <legend className="sr-only">Website design</legend>
        {TEMPLATES.map((template) => {
          const selected = chosen === template.id;
          return (
            <label
              key={template.id}
              className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container has-[:disabled]:cursor-default ${
                selected
                  ? 'border-primary bg-primary-fixed/20'
                  : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
              }`}
            >
              <input
                type="radio"
                name="website-template"
                value={template.id}
                checked={selected}
                onChange={() => void choose(template.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-20 items-center justify-center rounded-lg border border-outline-variant/60"
                style={{ background: template.swatch[0] }}
              >
                <span
                  className={`text-headline-sm ${template.id === 'modern' ? 'font-sans font-semibold tracking-tight' : 'font-serif'}`}
                  style={{ color: template.swatch[1] }}
                >
                  A <span style={{ color: template.swatch[2] }}>&amp;</span> A
                </span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="text-title-sm text-on-surface">{template.label}</span>
                {selected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-label-sm font-semibold text-on-primary">
                    <Icon name="check" className="size-3.5" />
                    {saving === template.id ? 'Saving…' : 'Selected'}
                  </span>
                )}
              </span>
              <span className="text-body-sm text-on-surface-variant">{template.description}</span>
              <span className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface-variant"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="flex items-start gap-2 rounded-lg bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant">
        <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-secondary" />
        <span>
          Switching designs never loses your words, questions or ceremonies.
          {publishedTemplateId && publishedTemplateId !== chosen
            ? ` Guests still see ${templateLabel(publishedTemplateId)} until you publish your changes.`
            : ''}
        </span>
      </p>
    </section>
  );
}

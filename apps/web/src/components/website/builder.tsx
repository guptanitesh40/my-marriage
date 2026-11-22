'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { inputClass } from '@/components/forms/text-field';
import { Icon, type IconName } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { partOfDay } from '@/lib/events/format';
import { eventsPath, publicSitePath, websitePreviewPath } from '@/lib/routes';
import { eventDay, eventTime, venueLabel, type Site, type SiteEvent } from '@/lib/website/site';
import { TEMPLATES, templateLabel, type TemplateId } from '@/lib/website/templates';
import type { Website } from '@/lib/website/website';
import { draftCoverPath, shrinkPhoto } from '@/lib/website/cover-photo';
import { LivePreview } from './live-preview';

const LIMITS = { headline: 120, story: 4000, faq: 20, question: 200, answer: 1500 } as const;

type Tab = 'basics' | 'ceremonies' | 'faq' | 'appearance';
const TABS: { id: Tab; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'ceremonies', label: 'Ceremonies' },
  { id: 'faq', label: 'FAQ' },
  { id: 'appearance', label: 'Appearance & Styles' },
];

interface Draft {
  templateId: TemplateId;
  headline: string;
  story: string;
  faq: { question: string; answer: string }[];
  /** The cover photo's ID; null when there is none, or it was taken off. */
  coverId: string | null;
}

function draftOf(website: Website): Draft {
  return {
    templateId: website.templateId,
    headline: website.content.headline ?? '',
    story: website.content.story ?? '',
    faq: website.content.faq.map((item) => ({ ...item })),
    coverId: website.content.coverImageId ?? null,
  };
}

const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

/** The site's origin, for the full address; empty while rendering on the server. */
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => '',
  );
}

type SlugCheck = { state: 'idle' | 'checking' | 'ok' } | { state: 'bad'; message: string };

/**
 * The Wedding Website builder (Stitch "Wedding Website Builder &
 * Management"): edit the site's words, FAQ and design in a draft, see them
 * live, and publish. The wedding's names, dates and ceremonies come from
 * the wedding and its events (decision 0017), so they're edited there.
 */
export function WebsiteBuilder({
  weddingId,
  website,
  preview,
}: {
  weddingId: string;
  website: Website;
  preview: Site;
}) {
  const router = useRouter();
  const origin = useOrigin();
  const [tab, setTab] = useState<Tab>('basics');
  const [draft, setDraft] = useState<Draft>(() => draftOf(website));
  const [saved, setSaved] = useState<Draft>(() => draftOf(website));
  const [version, setVersion] = useState(website.contentVersion);
  const [slug, setSlug] = useState(website.slug);
  const [savedSlug, setSavedSlug] = useState(website.slug);
  const [slugCheck, setSlugCheck] = useState<SlugCheck>({ state: 'idle' });
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'unpublish' | 'cover'>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<'loaded' | 'now'>('loaded');
  const publishDialog = useRef<HTMLDialogElement>(null);
  const unpublishDialog = useRef<HTMLDialogElement>(null);

  const writable = website.writable;
  const live = website.status === 'published';
  const archived = !writable;
  const dirty = !same(draft, saved) || slug !== savedSlug;
  const address = `${origin.replace(/^https?:\/\//, '')}${publicSitePath(slug)}`;

  // Asks whether a new address is free, a moment after typing stops.
  useEffect(() => {
    if (slug === savedSlug) return;
    const timer = setTimeout(async () => {
      setSlugCheck({ state: 'checking' });
      try {
        const { data } = await api.GET('/api/v1/weddings/{weddingId}/website/address', {
          params: { path: { weddingId }, query: { slug } },
        });
        if (!data) return setSlugCheck({ state: 'idle' });
        setSlugCheck(
          data.data.valid && data.data.available
            ? { state: 'ok' }
            : { state: 'bad', message: data.data.message ?? 'That address isn’t available.' },
        );
      } catch {
        setSlugCheck({ state: 'idle' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, savedSlug, weddingId]);

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 3500);
  }

  function change(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setFaqError(null);
  }

  /** Saves the address and the draft; the new content version, or null when it failed. */
  async function save(): Promise<number | null> {
    const faq = draft.faq
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
      .filter((item) => item.question || item.answer);
    if (faq.some((item) => !item.question || !item.answer)) {
      setTab('faq');
      setFaqError('Every question needs an answer, and every answer a question.');
      return null;
    }
    setAlert(null);
    try {
      if (slug !== savedSlug) {
        const { data, error, response } = await api.PATCH('/api/v1/weddings/{weddingId}', {
          params: { path: { weddingId } },
          body: { slug },
        });
        if (!data) {
          const failure = toFailure(response.status, error);
          setTab('basics');
          setSlugCheck({ state: 'bad', message: failure.fields.slug ?? failure.message });
          return null;
        }
        setSavedSlug(data.data.slug);
        setSlug(data.data.slug);
      }
      let current = version;
      const next: Draft = { ...draft, faq };
      if (!same(next, saved)) {
        const { data, error, response } = await api.PATCH('/api/v1/weddings/{weddingId}/website', {
          params: { path: { weddingId } },
          body: {
            ...(next.templateId !== saved.templateId ? { templateId: next.templateId } : {}),
            content:
              next.coverId === null && saved.coverId
                ? {
                    headline: next.headline.trim() || null,
                    story: next.story.trim() || null,
                    faq,
                    coverImageId: null,
                  }
                : { headline: next.headline.trim() || null, story: next.story.trim() || null, faq },
            contentVersion: version,
          },
        });
        if (!data) {
          const failure = toFailure(response.status, error);
          setAlert(failure.message);
          if (failure.code === 'WEBSITE_VERSION_CONFLICT' || failure.code === 'WEDDING_ARCHIVED') {
            router.refresh();
          }
          return null;
        }
        current = data.data.contentVersion;
        const stored = draftOf(data.data);
        setVersion(current);
        setSaved(stored);
        setDraft(stored);
      }
      setSavedAt('now');
      router.refresh();
      return current;
    } catch {
      setAlert(networkFailure().message);
      return null;
    }
  }

  async function saveDraft(thenPreview: boolean) {
    if (busy) return;
    setBusy('save');
    const done = await save();
    setBusy(null);
    if (done === null) return;
    if (thenPreview) router.push(websitePreviewPath(weddingId));
    else notify('Draft saved');
  }

  /**
   * Uploads a cover photo (decision 0018): shrunk here, sent straight to
   * storage with a short-lived form, then checked by the API, which makes
   * it the draft's cover. Unsaved words stay as they are.
   */
  async function uploadCover(file: File) {
    if (busy) return;
    setBusy('cover');
    setCoverError(null);
    try {
      let photo: Blob;
      try {
        photo = await shrinkPhoto(file);
      } catch {
        setCoverError('That file isn’t a photo we can use. Choose a JPEG, PNG or WebP image.');
        return;
      }
      const form = await api.POST('/api/v1/weddings/{weddingId}/website/cover-uploads', {
        params: { path: { weddingId } },
        body: { contentType: 'image/jpeg', bytes: photo.size },
      });
      if (!form.data) {
        setCoverError(toFailure(form.response.status, form.error).message);
        return;
      }
      const { uploadId, url, fields } = form.data.data;
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) body.append(key, value);
      body.append('file', photo, 'cover.jpg');
      const sent = await fetch(url, { method: 'POST', body });
      if (!sent.ok) {
        setCoverError('The photo didn’t upload. Please try again.');
        return;
      }
      const done = await api.POST(
        '/api/v1/weddings/{weddingId}/website/cover-uploads/{uploadId}/complete',
        { params: { path: { weddingId, uploadId } }, body: { contentVersion: version } },
      );
      if (!done.data) {
        const failure = toFailure(done.response.status, done.error);
        setCoverError(failure.message);
        if (failure.code === 'WEBSITE_VERSION_CONFLICT') router.refresh();
        return;
      }
      const coverId = done.data.data.content.coverImageId ?? null;
      setVersion(done.data.data.contentVersion);
      setSaved((current) => ({ ...current, coverId }));
      setDraft((current) => ({ ...current, coverId }));
      notify(live ? 'Cover photo added. Publish to show it to guests.' : 'Cover photo added');
      router.refresh();
    } catch {
      setCoverError(networkFailure().message);
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (busy) return;
    setBusy('publish');
    const current = dirty ? await save() : version;
    if (current === null) {
      setBusy(null);
      publishDialog.current?.close();
      return;
    }
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/website/publish',
        { params: { path: { weddingId } }, body: { contentVersion: current } },
      );
      publishDialog.current?.close();
      if (data) {
        notify(`Your website is live at ${address}`);
        router.refresh();
      } else {
        setAlert(toFailure(response.status, error).message);
        router.refresh();
      }
    } catch {
      publishDialog.current?.close();
      setAlert(networkFailure().message);
    }
    setBusy(null);
  }

  async function unpublish() {
    if (busy) return;
    setBusy('unpublish');
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/website/unpublish',
        { params: { path: { weddingId } } },
      );
      unpublishDialog.current?.close();
      if (data) notify('Your website is back to a private draft');
      else setAlert(toFailure(response.status, error).message);
      router.refresh();
    } catch {
      unpublishDialog.current?.close();
      setAlert(networkFailure().message);
    }
    setBusy(null);
  }

  // What the live preview shows: the saved site with the edits not saved yet.
  const site: Site = {
    ...preview,
    slug,
    templateId: draft.templateId,
    ...(draft.headline.trim() ? { headline: draft.headline.trim() } : { headline: undefined }),
    ...(draft.story.trim() ? { story: draft.story } : { story: undefined }),
    faq: draft.faq.filter((item) => item.question.trim() && item.answer.trim()),
    coverUrl: draft.coverId ? draftCoverPath(weddingId, draft.coverId) : undefined,
  };
  const shownEvents = preview.events.filter((event) => !event.cancelled);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    if (next) {
      setTab(next.id);
      document.getElementById(`website-tab-${next.id}`)?.focus();
    }
  }

  const status = archived
    ? {
        pill: 'Archived · Read-only',
        tone: 'bg-surface-container-high text-on-surface-variant',
        dot: 'bg-outline',
        text: live
          ? 'Your website stays as it is while the wedding is archived.'
          : 'This wedding is archived, so its website can’t be edited.',
      }
    : live
      ? {
          pill: 'Published · Live',
          tone: 'bg-primary-fixed text-on-primary-fixed',
          dot: 'bg-primary',
          text:
            website.hasUnpublishedChanges || dirty
              ? `Guests see the ${templateLabel(website.publishedTemplateId ?? website.templateId)} design. You have changes that aren’t published yet.`
              : `Your website is publicly accessible at ${address}.`,
        }
      : {
          pill: 'Draft · Not published',
          tone: 'bg-secondary-container text-on-secondary-container',
          dot: 'bg-secondary',
          text: 'Your website is private until you publish it.',
        };

  return (
    <div className="flex flex-col gap-6">
      {(live || archived) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-4 py-3 text-body-sm ${
            live ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'
          }`}
        >
          <p className="flex min-w-0 items-center gap-2">
            <Icon name={live ? 'verified' : 'lock'} className="size-5 shrink-0" />
            {live ? (
              <span className="min-w-0 wrap-break-word">
                Website is live at <b>{address}</b>
              </span>
            ) : (
              <span>This wedding is archived. Its website is read-only.</span>
            )}
          </p>
          {live && (
            <p className="flex items-center gap-4">
              <a
                href={publicSitePath(website.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                View published link
              </a>
              {(writable || website.canUnpublish) && (
                <button
                  type="button"
                  onClick={() => unpublishDialog.current?.showModal()}
                  className="font-semibold opacity-90 hover:opacity-100"
                >
                  Unpublish
                </button>
              )}
            </p>
          )}
        </div>
      )}

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            Public wedding website · Builder & publishing
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-primary sm:text-headline-lg">
            Wedding Website
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Create and publish a welcoming digital home for your wedding guests. Private wedding
            details stay protected.
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-md font-semibold ${status.tone}`}
            >
              <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
              {status.pill}
            </span>
            <span className="wrap-break-word">{status.text}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href={websitePreviewPath(weddingId)}
            className="inline-flex items-center gap-2.5 rounded-md bg-surface-container-lowest px-5 py-3 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
          >
            <Icon name="visibility" className="size-5" />
            Preview website
          </Link>
          {archived ? (
            <span className="inline-flex items-center gap-2.5 rounded-md bg-surface-container-high px-5 py-3 text-label-md font-semibold text-on-surface-variant">
              <Icon name="rocket-launch" className="size-5" />
              Archived
            </span>
          ) : (
            <button
              type="button"
              disabled={live && !website.hasUnpublishedChanges && !dirty}
              onClick={() => publishDialog.current?.showModal()}
              className={`inline-flex items-center gap-2.5 rounded-md px-5 py-3 text-label-md font-semibold shadow-sm transition-colors disabled:opacity-50 ${
                live
                  ? 'bg-secondary text-on-secondary hover:bg-on-secondary-container'
                  : 'bg-primary text-on-primary hover:bg-primary-container'
              }`}
            >
              <Icon name="rocket-launch" className="size-5" />
              {live ? 'Update published site' : 'Publish website'}
            </button>
          )}
        </div>
      </header>

      {alert && (
        <FormAlert tone="error" title="That didn’t work">
          {alert}
        </FormAlert>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section
          aria-label="Website editor"
          className="overflow-hidden rounded-2xl bg-surface-container-low shadow-sm"
        >
          <div
            role="tablist"
            aria-label="Website sections"
            className="flex gap-1 overflow-x-auto px-2 pt-2"
          >
            {TABS.map((item, index) => (
              <button
                key={item.id}
                id={`website-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`website-panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setTab(item.id)}
                onKeyDown={(event) => onTabKey(event, index)}
                className={`shrink-0 rounded-t-lg px-3.5 py-2.5 text-label-md font-semibold whitespace-nowrap transition-colors ${
                  tab === item.id
                    ? 'bg-surface-container-lowest text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <fieldset
            disabled={!writable}
            id={`website-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`website-tab-${tab}`}
            className="flex min-w-0 flex-col gap-5 bg-surface-container-lowest p-5 sm:p-6"
          >
            {tab === 'basics' && (
              <>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor="website-slug" className="text-title-sm font-semibold">
                      Public wedding URL
                    </label>
                    <SlugStatus check={slug === savedSlug ? { state: 'ok' } : slugCheck} />
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-surface-container-low px-3.5 py-2.5 focus-within:outline-2 focus-within:outline-primary-container">
                    <span className="shrink-0 text-body-sm text-on-surface-variant">
                      {(origin.replace(/^https?:\/\//, '') || '') + '/w/'}
                    </span>
                    <input
                      id="website-slug"
                      value={slug}
                      onChange={(event) =>
                        setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))
                      }
                      maxLength={60}
                      aria-describedby="website-slug-hint"
                      aria-invalid={slugCheck.state === 'bad' && slug !== savedSlug}
                      className="min-w-0 flex-1 bg-transparent text-title-sm font-semibold text-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(`${origin}${publicSitePath(slug)}`);
                        notify('Address copied');
                      }}
                      className="shrink-0 rounded p-1 text-on-surface-variant hover:text-primary"
                    >
                      <Icon name="content-copy" className="size-5" />
                      <span className="sr-only">Copy the address</span>
                    </button>
                  </div>
                  <p id="website-slug-hint" className="mt-1.5 text-body-sm text-on-surface-variant">
                    Short, memorable link for invitations and WhatsApp.
                    {live && slug !== savedSlug
                      ? ' Changing it moves your live website at once; old links keep working.'
                      : ''}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <p className="text-title-sm font-semibold">Cover photo</p>
                    <span className="text-label-sm text-on-surface-variant">JPEG, PNG or WebP</span>
                  </div>
                  {draft.coverId ? (
                    <div className="relative overflow-hidden rounded-xl bg-surface-container">
                      <Image
                        src={draftCoverPath(weddingId, draft.coverId)}
                        alt="Your website’s cover photo"
                        width={800}
                        height={450}
                        unoptimized
                        className="aspect-video w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-linear-to-t from-on-surface/60 to-transparent p-3">
                        <label className="cursor-pointer rounded-md bg-surface-container-lowest px-3 py-1.5 text-label-md font-semibold text-on-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container">
                          {busy === 'cover' ? 'Uploading…' : 'Replace'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={busy !== null}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (file) void uploadCover(file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => change({ coverId: null })}
                          className="rounded-md bg-surface-container-lowest px-3 py-1.5 text-label-md font-semibold text-error"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low px-4 py-8 text-center transition-colors hover:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container">
                      <Icon name="image" className="size-8 text-secondary" />
                      <span className="text-title-sm font-semibold text-primary">
                        {busy === 'cover' ? 'Uploading your photo…' : 'Upload a cover photo'}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        A couple portrait or your venue makes the welcome shine. It’s shown on your
                        website and your guests’ RSVP page.
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={busy !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (file) void uploadCover(file);
                        }}
                      />
                    </label>
                  )}
                  {coverError && (
                    <p role="alert" className="mt-1.5 text-body-sm text-error">
                      {coverError}
                    </p>
                  )}
                  {draft.coverId === null && saved.coverId && (
                    <p className="mt-1.5 text-body-sm text-on-surface-variant">
                      The cover photo comes off when you save.
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-1.5 text-title-sm font-semibold">Couple display names</p>
                  <p className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3.5 py-2.5 text-body-md">
                    {preview.coupleName}
                  </p>
                  <p className="mt-1.5 text-body-sm text-on-surface-variant">
                    From your wedding setup, so they read the same everywhere.
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor="website-headline" className="text-title-sm font-semibold">
                      Welcome headline
                    </label>
                    <span className="text-label-sm text-on-surface-variant">
                      {draft.headline.length}/{LIMITS.headline}
                    </span>
                  </div>
                  <input
                    id="website-headline"
                    value={draft.headline}
                    maxLength={LIMITS.headline}
                    placeholder="We’re getting married in Jaipur"
                    onChange={(event) => change({ headline: event.target.value })}
                    className={`${inputClass} border-outline-variant/60`}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor="website-story" className="text-title-sm font-semibold">
                      Our story
                    </label>
                    <span className="text-label-sm text-on-surface-variant">
                      A blank line starts a new paragraph
                    </span>
                  </div>
                  <textarea
                    id="website-story"
                    value={draft.story}
                    maxLength={LIMITS.story}
                    rows={7}
                    placeholder="From our first coffee in Mumbai to late night walks across Marine Drive…"
                    onChange={(event) => change({ story: event.target.value })}
                    className={`${inputClass} border-outline-variant/60 leading-relaxed`}
                  />
                </div>
              </>
            )}

            {tab === 'ceremonies' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-title-md font-semibold text-on-surface">
                      Included ceremonies
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      Synchronized in real time with your Events.
                    </p>
                  </div>
                  <Link
                    href={eventsPath(weddingId)}
                    className="inline-flex shrink-0 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
                  >
                    Manage events
                    <Icon name="open-in-new" className="size-4" />
                  </Link>
                </div>
                {preview.events.length === 0 ? (
                  <p className="rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
                    No ceremonies yet. Add them on the Events page and they’ll appear here and on
                    your website.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {preview.events.map((event, index) => (
                      <CeremonyRow key={index} event={event} />
                    ))}
                  </ul>
                )}
                <p className="flex items-start gap-2.5 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
                  <Icon name="info" className="mt-0.5 size-4.5 shrink-0" />
                  Only public venues, timings and attire are shown. Guest lists, vendor details and
                  private notes stay hidden. Every ceremony shows; cancelled ones are marked
                  cancelled.
                </p>
              </>
            )}

            {tab === 'faq' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-title-md font-semibold text-on-surface">
                      Guest FAQ editor
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      Help out-of-town guests with arrival, dress codes and logistics.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={draft.faq.length >= LIMITS.faq}
                    onClick={() => change({ faq: [...draft.faq, { question: '', answer: '' }] })}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-container px-3 py-2 text-label-md font-semibold text-primary hover:bg-surface-container-high disabled:opacity-50"
                  >
                    <Icon name="add" className="size-4.5" />
                    Add FAQ
                  </button>
                </div>
                {faqError && (
                  <p role="alert" className="text-body-sm text-error">
                    {faqError}
                  </p>
                )}
                {draft.faq.length === 0 ? (
                  <p className="rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
                    No questions yet. Add the ones guests ask most: what to wear, parking,
                    transport.
                  </p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {draft.faq.map((item, index) => (
                      <li
                        key={index}
                        className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4"
                      >
                        <div className="flex items-start gap-2">
                          <label className="sr-only" htmlFor={`faq-q-${index}`}>
                            Question {index + 1}
                          </label>
                          <input
                            id={`faq-q-${index}`}
                            value={item.question}
                            maxLength={LIMITS.question}
                            placeholder="What is the dress code?"
                            onChange={(event) =>
                              change({
                                faq: draft.faq.map((faq, i) =>
                                  i === index ? { ...faq, question: event.target.value } : faq,
                                ),
                              })
                            }
                            className="min-w-0 flex-1 bg-transparent text-title-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:underline"
                          />
                          <FaqButton
                            icon="arrow-upward"
                            label={`Move question ${index + 1} up`}
                            disabled={index === 0}
                            onClick={() => change({ faq: moved(draft.faq, index, -1) })}
                          />
                          <FaqButton
                            icon="arrow-downward"
                            label={`Move question ${index + 1} down`}
                            disabled={index === draft.faq.length - 1}
                            onClick={() => change({ faq: moved(draft.faq, index, 1) })}
                          />
                          <FaqButton
                            icon="delete"
                            label={`Remove question ${index + 1}`}
                            onClick={() => change({ faq: draft.faq.filter((_, i) => i !== index) })}
                          />
                        </div>
                        <label className="sr-only" htmlFor={`faq-a-${index}`}>
                          Answer {index + 1}
                        </label>
                        <textarea
                          id={`faq-a-${index}`}
                          value={item.answer}
                          maxLength={LIMITS.answer}
                          rows={3}
                          placeholder="Haldi: sunny yellow and pastels. Wedding: traditional Indian finery."
                          onChange={(event) =>
                            change({
                              faq: draft.faq.map((faq, i) =>
                                i === index ? { ...faq, answer: event.target.value } : faq,
                              ),
                            })
                          }
                          className="w-full resize-y bg-transparent text-body-sm leading-relaxed text-on-surface-variant outline-none placeholder:text-on-surface-variant/70"
                        />
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}

            {tab === 'appearance' && (
              <>
                <div>
                  <h2 className="text-title-md font-semibold text-on-surface">
                    Website design template
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    Select the aesthetic tone that mirrors your celebration.
                  </p>
                </div>
                <div role="radiogroup" aria-label="Website design" className="flex flex-col gap-2">
                  {TEMPLATES.map((template, index) => {
                    const chosen = draft.templateId === template.id;
                    return (
                      <label
                        key={template.id}
                        className={`flex cursor-pointer flex-col gap-2.5 rounded-xl p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container ${
                          chosen ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="website-template"
                          value={template.id}
                          checked={chosen}
                          onChange={() => change({ templateId: template.id })}
                          className="sr-only"
                        />
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2.5 text-title-sm font-semibold text-on-surface">
                            <span
                              aria-hidden="true"
                              className={`size-2.5 rounded-full ${template.dot}`}
                            />
                            {index + 1}. {template.label}
                          </span>
                          {chosen && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-label-sm font-semibold text-on-primary">
                              Active choice
                            </span>
                          )}
                        </span>
                        <span className="text-body-sm text-on-surface-variant">
                          {template.description}
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          {template.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-surface-container-lowest px-2 py-0.5 text-label-sm text-on-surface-variant"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="flex items-start gap-2.5 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
                  <Icon name="shield" className="mt-0.5 size-4.5 shrink-0 text-secondary" />
                  Switching styles never loses your words, questions or ceremonies.
                  {live &&
                  website.publishedTemplateId &&
                  website.publishedTemplateId !== draft.templateId
                    ? ` Guests still see ${templateLabel(website.publishedTemplateId)} until you publish your changes.`
                    : ''}
                </p>
              </>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p
              role="status"
              className="flex items-center gap-2 text-label-sm text-on-surface-variant"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${dirty ? 'bg-secondary' : 'bg-primary'}`}
              />
              {busy === 'save'
                ? 'Saving…'
                : dirty
                  ? 'Unsaved changes'
                  : savedAt === 'now'
                    ? 'Draft saved · just now'
                    : 'Draft saved'}
            </p>
            {writable && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!dirty || busy !== null}
                  onClick={() => void saveDraft(false)}
                  className="rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-xs hover:bg-surface disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void saveDraft(true)}
                  className="rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-50"
                >
                  Save & preview
                </button>
              </div>
            )}
          </div>
        </section>

        <LivePreview site={site} />
      </div>

      <dialog
        ref={publishDialog}
        aria-labelledby="publish-title"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/40 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"
          >
            <Icon name="rocket-launch" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="publish-title" className="font-serif text-headline-sm text-primary">
              {live ? 'Update your published website?' : 'Ready to share your wedding website?'}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {website.readiness.ready
                ? 'Publish readiness check passed'
                : 'A few things are needed first'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => publishDialog.current?.close()}
            className="rounded p-1 text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <ul className="mt-5 flex flex-col gap-2.5">
          <ReadinessRow
            ok={Boolean(website.readiness.checks.find((check) => check.key === 'names')?.ok)}
            title="Couple names recorded"
            detail={preview.coupleName}
          />
          <ReadinessRow
            ok={shownEvents.length > 0}
            title={
              shownEvents.length === 1
                ? '1 ceremony ready to display'
                : `${shownEvents.length} ceremonies ready to display`
            }
            detail={
              shownEvents.length > 0
                ? shownEvents.map((event) => event.title).join(', ')
                : 'Add at least one ceremony on the Events page.'
            }
          />
          <ReadinessRow
            ok={Boolean(website.readiness.checks.find((check) => check.key === 'address')?.ok)}
            title="Public address reserved"
            detail={address}
          />
        </ul>
        <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
          <Icon name="shield" className="mt-0.5 size-4.5 shrink-0" />
          <span>
            <b className="text-on-surface">Privacy guaranteed:</b> when published, ceremony
            schedules, venues and your story become viewable. Guest lists, budgets and private RSVPs
            stay protected behind your sign-in.
          </span>
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => publishDialog.current?.close()}
            className="rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!website.readiness.ready || busy !== null}
            onClick={() => void publish()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name="check-circle" className="size-4.5" />
            {busy === 'publish' ? 'Publishing…' : live ? 'Confirm & update' : 'Confirm & publish'}
          </button>
        </div>
      </dialog>

      <dialog
        ref={unpublishDialog}
        aria-labelledby="unpublish-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/40 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error-container text-error"
          >
            <Icon name="visibility-off" className="size-5" />
          </span>
          <h2 id="unpublish-title" className="flex-1 pt-1.5 font-serif text-headline-sm">
            Unpublish website?
          </h2>
          <button
            type="button"
            onClick={() => unpublishDialog.current?.close()}
            className="rounded p-1 text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <p className="mt-4 text-body-md text-on-surface">
          Your website will instantly go back to <b>draft</b>. Guests visiting{' '}
          <span className="font-mono text-body-sm">{address}</span> will see a “not available” page
          until you publish again.
        </p>
        <p className="mt-4 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
          Don’t worry: your words, questions and design stay as they are.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => unpublishDialog.current?.close()}
            className="rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high"
          >
            Keep published
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void unpublish()}
            className="rounded-md bg-error px-4 py-2.5 text-label-md font-semibold text-on-error hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish site'}
          </button>
        </div>
      </dialog>

      {toast && (
        <p
          role="status"
          className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl bg-on-surface px-4 py-3 text-body-sm text-surface shadow-lg"
        >
          <Icon name="check-circle" className="size-5 shrink-0" />
          {toast}
        </p>
      )}
    </div>
  );
}

function moved<T>(items: readonly T[], index: number, step: -1 | 1): T[] {
  const next = [...items];
  const target = index + step;
  const [item] = next.splice(index, 1);
  if (item !== undefined) next.splice(target, 0, item);
  return next;
}

function FaqButton({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30"
    >
      <Icon name={icon} className="size-4.5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function SlugStatus({ check }: { check: SlugCheck }) {
  if (check.state === 'checking') {
    return <span className="text-label-sm text-on-surface-variant">Checking…</span>;
  }
  if (check.state === 'bad') {
    return (
      <span role="alert" className="text-label-sm font-semibold text-error">
        {check.message}
      </span>
    );
  }
  if (check.state === 'ok') {
    return (
      <span className="flex items-center gap-1 text-label-sm font-semibold text-primary">
        <Icon name="check-circle" className="size-4" />
        Available
      </span>
    );
  }
  return null;
}

const CEREMONY_ICON_TONES = [
  'bg-secondary-container/60 text-secondary',
  'bg-surface-container-high text-primary',
  'bg-primary-fixed/60 text-primary',
] as const;

function CeremonyRow({ event }: { event: SiteEvent }) {
  const day = eventDay(event);
  const part = partOfDay(event.startTime);
  const icon: IconName =
    part === 'Morning' || part === 'Afternoon'
      ? 'wb-sunny'
      : part
        ? 'local-fire-department'
        : 'celebration';
  const tone = CEREMONY_ICON_TONES[(event.title.length + (day ? Number(day.day) : 0)) % 3];
  const details = [
    day ? `${day.month} ${day.day}` : 'Date to be announced',
    eventTime(event),
    venueLabel(event),
  ].filter(Boolean);
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
      <span
        aria-hidden="true"
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}
      >
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-title-sm font-semibold wrap-break-word ${event.cancelled ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}
        >
          {event.title}
        </span>
        <span className="block text-body-sm text-on-surface-variant">{details.join(' · ')}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${
          event.cancelled
            ? 'bg-surface-container-high text-on-surface-variant'
            : 'bg-primary text-on-primary'
        }`}
      >
        {event.cancelled ? 'Cancelled' : 'Shown'}
      </span>
    </li>
  );
}

function ReadinessRow({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-surface-container-low px-4 py-3">
      <Icon
        name={ok ? 'check-circle' : 'error'}
        className={`mt-0.5 size-5 shrink-0 ${ok ? 'text-primary' : 'text-error'}`}
      />
      <span className="min-w-0">
        <span className="block text-title-sm font-semibold text-on-surface">{title}</span>
        <span className="block text-body-sm wrap-break-word text-on-surface-variant">{detail}</span>
      </span>
    </li>
  );
}

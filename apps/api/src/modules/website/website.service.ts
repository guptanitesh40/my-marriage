import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model, Types } from 'mongoose';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { EventsService, type EventBrief } from '../events/events.service.js';
import type { Wedding } from '../weddings/schemas/wedding.schema.js';
import type { MembershipRole } from '../weddings/schemas/wedding-membership.schema.js';
import { isValidSlug, SLUG_MESSAGE } from '../weddings/slug.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { ownersOnly, weddingArchived } from '../weddings/wedding-errors.js';
import type { PublicWebsiteDto } from './dto/public-website.dto.js';
import type {
  CoverUploadRequestDto,
  PublishWebsiteDto,
  UpdateWebsiteDto,
} from './dto/website-input.dto.js';
import type {
  CoverUploadDto,
  ReadinessCheckDto,
  SlugAvailabilityDto,
  WebsiteDto,
  WebsiteReadinessDto,
} from './dto/website.dto.js';
import { WebsiteConfig, type WebsiteContent } from './schemas/website-config.schema.js';
import { websiteChanged, websiteNotReady } from './website-errors.js';
import { COVER_MAX_BYTES, DEFAULT_TEMPLATE, type WebsiteTemplate } from './website-policy.js';
import { draftCoverUrl, publicCoverUrl, WebsiteImagesService } from './website-images.service.js';
import type { StoredObject } from '../../platform/storage/object-storage.js';
import { contentDto, projectWebsite } from './website-projection.js';

type StoredWedding = Wedding & { _id: Types.ObjectId };
type StoredConfig = WebsiteConfig & { _id: Types.ObjectId };

/** MongoDB's duplicate-key error: here, two first saves of one website at once. */
function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

/**
 * A wedding's website, for its owners and managers (PRD SITE-01 to SITE-07,
 * decision 0017). Edits change a draft; only publishing changes what the
 * public sees. The wedding and its events stay the source of names, the
 * address and every ceremony detail: the website stores only its own words
 * and the template. Every query is scoped to the wedding the access check
 * returned.
 */
@Traced()
@Injectable()
export class WebsiteService {
  private readonly logger = new Logger(WebsiteService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(WebsiteConfig.name) private readonly configs: Model<WebsiteConfig>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly images: WebsiteImagesService,
  ) {}

  /** The draft, what is published, and whether it can be published. A new site is an empty draft. */
  async get(user: AuthenticatedUser, weddingId: string): Promise<WebsiteDto> {
    const { wedding, role } = await this.access.require(user, weddingId);
    const [config, events] = await Promise.all([
      this.configs.findOne({ weddingId: wedding._id }).lean(),
      this.events.briefs(wedding._id),
    ]);
    return this.toDto(wedding, role, config, events);
  }

  /**
   * Saves the draft: the template and the website's own words. Fields left
   * out stay; the FAQ list is replaced whole. The save names the version it
   * started from, and a newer one is refused, never overwritten. The public
   * site does not change until the draft is published.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    input: UpdateWebsiteDto,
  ): Promise<WebsiteDto> {
    const { wedding, role, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();

    let saved: StoredConfig | null;
    try {
      saved = await this.connection.transaction(async (session) => {
        const existing = await this.configs
          .findOne({ weddingId: wedding._id })
          .session(session)
          .lean();
        const version = existing?.contentVersion ?? 0;
        if (input.contentVersion !== version) throw websiteChanged();
        await this.access.raiseWriteFence(wedding._id, session);
        return this.configs
          .findOneAndUpdate(
            { weddingId: wedding._id, contentVersion: version },
            {
              $set: {
                templateId: input.templateId ?? existing?.templateId ?? DEFAULT_TEMPLATE,
                content: this.mergeContent(existing?.content, input.content),
                contentVersion: version + 1,
                updatedBy: userId,
              },
              $setOnInsert: { weddingId: wedding._id, published: false },
            },
            { upsert: true, returnDocument: 'after', session },
          )
          .lean();
      });
    } catch (error) {
      // Two first saves at once: one created the website first.
      if (isDuplicateKey(error)) throw websiteChanged();
      throw error;
    }
    await this.tidyCovers(wedding._id, saved);
    return this.toDto(wedding, role, saved, await this.events.briefs(wedding._id));
  }

  /**
   * The website's address when it is published, so invitation and reminder
   * links can open it (guests answer there with their private link); null
   * while it is a draft.
   */
  async publishedAddress(weddingId: Types.ObjectId): Promise<string | null> {
    const [config, couple] = await Promise.all([
      this.configs.exists({ weddingId, published: true }),
      this.access.coupleOf(weddingId),
    ]);
    return config && couple ? couple.slug : null;
  }

  /**
   * How a guest's private RSVP page looks: like the published website,
   * with its design and cover photo. While the website is a draft (never
   * published, or taken down) guests see the standard RSVP page, so nothing
   * from an unpublished website reaches them.
   */
  async designFor(
    weddingId: Types.ObjectId,
    slug: string,
  ): Promise<{ templateId: WebsiteTemplate; coverUrl?: string }> {
    const config = await this.configs
      .findOne({ weddingId, published: true }, { publishedTemplateId: 1, publishedContent: 1 })
      .lean();
    if (!config?.publishedTemplateId) return { templateId: DEFAULT_TEMPLATE };
    const cover = config.publishedContent?.coverAssetId;
    return {
      templateId: config.publishedTemplateId,
      ...(cover ? { coverUrl: publicCoverUrl(slug, cover) } : {}),
    };
  }

  /**
   * The draft as the public site would show it, for members only and never
   * cached (PRD SITE-04). Archived weddings can still be previewed.
   */
  async preview(user: AuthenticatedUser, weddingId: string): Promise<PublicWebsiteDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const [config, events] = await Promise.all([
      this.configs.findOne({ weddingId: wedding._id }).lean(),
      this.events.briefs(wedding._id),
    ]);
    const cover = config?.content.coverAssetId;
    return projectWebsite({
      wedding,
      templateId: config?.templateId ?? DEFAULT_TEMPLATE,
      content: config?.content,
      events,
      preview: true,
      ...(cover ? { coverUrl: draftCoverUrl(wedding._id, cover) } : {}),
    });
  }

  /**
   * Publishes the saved draft at `contentVersion`: the first publication or
   * an update to a published site. Needs couple names, an address and one
   * ceremony that is neither deleted nor cancelled (PRD SITE-04). Done in
   * one transaction with the archive write fence.
   */
  async publish(
    user: AuthenticatedUser,
    weddingId: string,
    input: PublishWebsiteDto,
  ): Promise<WebsiteDto> {
    const { wedding, role, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const readiness = this.readinessOf(wedding, await this.events.briefs(wedding._id));
    if (!readiness.ready) {
      throw websiteNotReady(readiness.checks.filter((c) => !c.ok).map((c) => c.message));
    }

    let published: StoredConfig | null;
    try {
      published = await this.connection.transaction(async (session) => {
        const existing = await this.configs
          .findOne({ weddingId: wedding._id })
          .session(session)
          .lean();
        const version = existing?.contentVersion ?? 0;
        if (input.contentVersion !== version) throw websiteChanged();
        await this.access.raiseWriteFence(wedding._id, session);
        const templateId = existing?.templateId ?? DEFAULT_TEMPLATE;
        const content = existing?.content ?? { faq: [] };
        return this.configs
          .findOneAndUpdate(
            { weddingId: wedding._id, contentVersion: version },
            {
              $set: {
                published: true,
                publishedTemplateId: templateId,
                publishedContent: content,
                publishedVersion: version,
                publishedAt: new Date(),
                lastPublishedBy: userId,
              },
              $setOnInsert: {
                weddingId: wedding._id,
                templateId,
                content,
                contentVersion: version,
              },
            },
            { upsert: true, returnDocument: 'after', session },
          )
          .lean();
      });
    } catch (error) {
      if (isDuplicateKey(error)) throw websiteChanged();
      throw error;
    }
    // Who published, for the record (PRD TEAM-05), until an audit log exists.
    this.logger.log('Website published', {
      weddingId: wedding._id.toHexString(),
      by: userId.toHexString(),
      version: published?.publishedVersion,
    });
    await this.tidyCovers(wedding._id, published);
    return this.toDto(wedding, role, published, await this.events.briefs(wedding._id));
  }

  /**
   * A form to upload a new cover photo to (decision 0018). The photo
   * becomes the draft's cover only once it is uploaded and checked.
   */
  async requestCoverUpload(
    user: AuthenticatedUser,
    weddingId: string,
    input: CoverUploadRequestDto,
  ): Promise<CoverUploadDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const { asset, target, expiresAt } = await this.images.createUpload(
      wedding._id,
      userId,
      input.contentType,
    );
    return {
      uploadId: asset._id.toHexString(),
      url: target.url,
      fields: target.fields,
      maxBytes: COVER_MAX_BYTES,
      expiresAt,
    };
  }

  /**
   * Checks the uploaded photo and makes it the draft's cover, as a draft
   * edit at `contentVersion`: guests see it once it is published.
   */
  async completeCoverUpload(
    user: AuthenticatedUser,
    weddingId: string,
    uploadId: string,
    input: PublishWebsiteDto,
  ): Promise<WebsiteDto> {
    const { wedding, role, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const asset = await this.images.acceptUpload(wedding._id, uploadId);

    let saved: StoredConfig | null;
    try {
      saved = await this.connection.transaction(async (session) => {
        const existing = await this.configs
          .findOne({ weddingId: wedding._id })
          .session(session)
          .lean();
        const version = existing?.contentVersion ?? 0;
        if (input.contentVersion !== version) throw websiteChanged();
        await this.access.raiseWriteFence(wedding._id, session);
        return this.configs
          .findOneAndUpdate(
            { weddingId: wedding._id, contentVersion: version },
            {
              $set: {
                templateId: existing?.templateId ?? DEFAULT_TEMPLATE,
                content: { ...this.mergeContent(existing?.content, {}), coverAssetId: asset._id },
                contentVersion: version + 1,
                updatedBy: userId,
              },
              $setOnInsert: { weddingId: wedding._id, published: false },
            },
            { upsert: true, returnDocument: 'after', session },
          )
          .lean();
      });
    } catch (error) {
      // The photo is checked but unused: the next tidy-up removes it.
      await this.tidyCovers(
        wedding._id,
        await this.configs.findOne({ weddingId: wedding._id }).lean(),
      );
      if (isDuplicateKey(error)) throw websiteChanged();
      throw error;
    }
    await this.tidyCovers(wedding._id, saved);
    return this.toDto(wedding, role, saved, await this.events.briefs(wedding._id));
  }

  /** A photo of this wedding's website, for its members (the draft's cover). */
  async image(user: AuthenticatedUser, weddingId: string, imageId: string): Promise<StoredObject> {
    const { wedding } = await this.access.require(user, weddingId);
    return this.images.read(wedding._id, imageId);
  }

  /** Keeps the covers the draft and the published site use; removes the rest. */
  private async tidyCovers(
    weddingId: Types.ObjectId,
    config: Pick<StoredConfig, 'content' | 'publishedContent'> | null,
  ): Promise<void> {
    await this.images.tidy(weddingId, [
      config?.content.coverAssetId,
      config?.publishedContent?.coverAssetId,
    ]);
  }

  /**
   * Takes the site down at once; the draft stays. Owners and managers while
   * the wedding is active; once it is archived, only an owner, as a safety
   * exception to read-only (PRD SITE-07).
   */
  async unpublish(user: AuthenticatedUser, weddingId: string): Promise<WebsiteDto> {
    const { wedding, role, userId } = await this.access.require(user, weddingId);
    const archived = wedding.status !== 'active';
    if (archived && role !== 'owner') throw ownersOnly();

    const takeDown = {
      $set: { published: false },
      $unset: {
        publishedTemplateId: 1,
        publishedContent: 1,
        publishedVersion: 1,
        publishedAt: 1,
      },
    } as const;
    const filter = { weddingId: wedding._id };
    const config = archived
      ? await this.configs.findOneAndUpdate(filter, takeDown, { returnDocument: 'after' }).lean()
      : await this.connection.transaction(async (session) => {
          await this.access.raiseWriteFence(wedding._id, session);
          return this.configs
            .findOneAndUpdate(filter, takeDown, { returnDocument: 'after', session })
            .lean();
        });
    this.logger.log('Website unpublished', {
      weddingId: wedding._id.toHexString(),
      by: userId.toHexString(),
      archived,
    });
    return this.toDto(wedding, role, config, await this.events.briefs(wedding._id));
  }

  /** Whether a web address could be this wedding's (decision 0017). Changing it is a wedding edit. */
  async slugAvailability(
    user: AuthenticatedUser,
    weddingId: string,
    slug: string,
  ): Promise<SlugAvailabilityDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const wanted = slug.trim().toLowerCase();
    if (!isValidSlug(wanted)) {
      return { slug: wanted, valid: false, available: false, message: SLUG_MESSAGE };
    }
    const available = await this.access.slugAvailable(wedding._id, wanted);
    return {
      slug: wanted,
      valid: true,
      available,
      ...(available ? {} : { message: 'That address is already taken. Try another one.' }),
    };
  }

  /** What publishing needs (PRD SITE-04), each with what is there or what to do. */
  private readinessOf(wedding: StoredWedding, events: readonly EventBrief[]): WebsiteReadinessDto {
    const usable = events.filter((event) => !event.deleted && !event.cancelled).length;
    const checks: ReadinessCheckDto[] = [
      {
        key: 'names',
        ok: Boolean(wedding.brideName && wedding.groomName),
        message: `${wedding.brideName} & ${wedding.groomName}`,
      },
      { key: 'address', ok: isValidSlug(wedding.slug), message: `/w/${wedding.slug}` },
      {
        key: 'ceremonies',
        ok: usable > 0,
        message:
          usable === 0
            ? 'Add at least one ceremony on the Events page.'
            : usable === 1
              ? '1 ceremony ready to show'
              : `${usable} ceremonies ready to show`,
      },
    ];
    return { ready: checks.every((check) => check.ok), checks };
  }

  /** The saved words with an edit applied: `null` or empty clears a text, the FAQ list is replaced. */
  private mergeContent(
    saved: WebsiteContent | undefined,
    edit: UpdateWebsiteDto['content'],
  ): WebsiteContent {
    const pick = (next: string | null | undefined, previous: string | undefined) =>
      next === undefined ? previous : next || undefined;
    const headline = pick(edit?.headline, saved?.headline);
    const story = pick(edit?.story, saved?.story);
    const faq = edit?.faq ?? saved?.faq ?? [];
    // Only null (or empty) is accepted: a new cover comes from an upload.
    const cover =
      edit?.coverImageId === null || edit?.coverImageId === '' ? undefined : saved?.coverAssetId;
    return {
      ...(headline ? { headline } : {}),
      ...(story ? { story } : {}),
      faq: faq.map((item) => ({ question: item.question, answer: item.answer })),
      ...(cover ? { coverAssetId: cover } : {}),
    };
  }

  private toDto(
    wedding: StoredWedding,
    role: MembershipRole,
    config: StoredConfig | null,
    events: readonly EventBrief[],
  ): WebsiteDto {
    const published = Boolean(config?.published);
    const writable = wedding.status === 'active';
    return {
      templateId: config?.templateId ?? DEFAULT_TEMPLATE,
      content: contentDto(config?.content),
      ...(config?.content.coverAssetId
        ? { coverUrl: draftCoverUrl(wedding._id, config.content.coverAssetId) }
        : {}),
      contentVersion: config?.contentVersion ?? 0,
      status: published ? 'published' : 'draft',
      ...(published && config?.publishedTemplateId
        ? { publishedTemplateId: config.publishedTemplateId }
        : {}),
      ...(published && config?.publishedAt ? { publishedAt: config.publishedAt } : {}),
      hasUnpublishedChanges: published && config?.publishedVersion !== config?.contentVersion,
      slug: wedding.slug,
      readiness: this.readinessOf(wedding, events),
      writable,
      canUnpublish: published && (writable || role === 'owner'),
      ...(config?.updatedAt ? { updatedAt: config.updatedAt } : {}),
    };
  }
}

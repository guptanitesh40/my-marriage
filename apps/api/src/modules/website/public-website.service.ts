import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Traced } from '../../platform/tracing.js';
import { EventsService } from '../events/events.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import type { PublicEventListDto, PublicWebsiteDto } from './dto/public-website.dto.js';
import { WebsiteConfig } from './schemas/website-config.schema.js';
import { imageNotFound, websiteNotFound } from './website-errors.js';
import { publicCoverUrl, WebsiteImagesService } from './website-images.service.js';
import type { StoredObject } from '../../platform/storage/object-storage.js';
import { projectWebsite, publicEvents } from './website-projection.js';

/**
 * The public wedding website (PRD SITE-05 to SITE-07, decision 0017): the
 * published version only, for anyone, with no account. A missing address,
 * an unpublished site and a wedding being deleted all answer the same 404.
 * An archived wedding's published site stays up. An old address answers
 * with the current one in `slug`, so the page can redirect.
 */
@Traced()
@Injectable()
export class PublicWebsiteService {
  constructor(
    @InjectModel(WebsiteConfig.name) private readonly configs: Model<WebsiteConfig>,
    private readonly access: WeddingAccessService,
    private readonly eventsService: EventsService,
    private readonly images: WebsiteImagesService,
  ) {}

  async site(slug: string): Promise<PublicWebsiteDto> {
    const { wedding, config } = await this.published(slug);
    const cover = config.content?.coverAssetId;
    return projectWebsite({
      wedding,
      templateId: config.templateId,
      content: config.content,
      events: await this.eventsService.briefs(wedding._id),
      preview: false,
      ...(cover ? { coverUrl: publicCoverUrl(wedding.slug, cover) } : {}),
    });
  }

  /** The published site's cover photo; not found when there is none, or no site. */
  async cover(slug: string): Promise<StoredObject> {
    const { wedding, config } = await this.published(slug);
    const cover = config.content?.coverAssetId;
    if (!cover) throw imageNotFound();
    return this.images.read(wedding._id, cover);
  }

  async eventList(slug: string): Promise<PublicEventListDto> {
    const { wedding } = await this.published(slug);
    return { events: publicEvents(await this.eventsService.briefs(wedding._id)) };
  }

  /** The wedding and its published template and words, or 404. */
  private async published(slug: string) {
    const found = await this.access.bySlug(slug.toLowerCase());
    if (!found || found.wedding.status === 'deletion_pending') throw websiteNotFound();
    const config = await this.configs
      .findOne(
        { weddingId: found.wedding._id, published: true },
        { publishedTemplateId: 1, publishedContent: 1 },
      )
      .lean();
    if (!config?.publishedTemplateId) throw websiteNotFound();
    return {
      wedding: found.wedding,
      config: { templateId: config.publishedTemplateId, content: config.publishedContent },
    };
  }
}

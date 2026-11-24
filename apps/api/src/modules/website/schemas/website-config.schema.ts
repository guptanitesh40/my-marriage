import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import { WEBSITE_TEMPLATES, type WebsiteTemplate } from '../website-policy.js';

/** One question and its answer for guests. */
export class WebsiteFaq {
  question: string;
  answer: string;
}

/**
 * What the website says beyond the wedding and its events, which stay the
 * source of their own details. The same for every template (PRD SITE-02).
 */
export class WebsiteContent {
  headline?: string;
  story?: string;
  faq: WebsiteFaq[];
  /** The cover photo, a `file_assets` record; never a raw storage key or URL. */
  coverAssetId?: Types.ObjectId;
  /**
   * Show the wedding's main venue (name, address, map link from Settings)
   * on the website. Off unless the couple turns it on (decision 0022).
   */
  showVenue?: boolean;
  /**
   * Show the approved photos as a gallery on the website. Off unless the
   * couple turns it on: nobody's photo is public by default (decision 0024).
   */
  showGallery?: boolean;
}

const contentShape = {
  coverAssetId: { type: Types.ObjectId },
  showVenue: { type: Boolean },
  showGallery: { type: Boolean },
  headline: { type: String },
  story: { type: String },
  faq: {
    type: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        _id: false,
      },
    ],
    default: [],
  },
};

/**
 * A wedding's website (schema document §4.17, decision 0017). The editor
 * works on a draft (`templateId`, `content`, `contentVersion`); publishing
 * copies it into the `published*` fields, which are all the public site
 * reads. Saving a draft never changes the public site.
 */
@Schema({ collection: 'website_configs', timestamps: true })
export class WebsiteConfig {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: String, enum: WEBSITE_TEMPLATES, required: true })
  templateId: WebsiteTemplate;

  @Prop({ type: contentShape, _id: false, required: true })
  content: WebsiteContent;

  /** Raised on every saved draft; a save must name the version it started from. */
  @Prop({ type: Number, required: true, min: 0 })
  contentVersion: number;

  @Prop({ type: Boolean, required: true })
  published: boolean;

  @Prop({ type: String, enum: WEBSITE_TEMPLATES })
  publishedTemplateId?: WebsiteTemplate;

  @Prop({ type: contentShape, _id: false })
  publishedContent?: WebsiteContent;

  /** The draft version that was published; behind `contentVersion` when there are unpublished changes. */
  @Prop({ type: Number })
  publishedVersion?: number;

  /** When the current publication was made. */
  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Types.ObjectId })
  lastPublishedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type WebsiteConfigDocument = HydratedDocument<WebsiteConfig>;
export const WebsiteConfigSchema = SchemaFactory.createForClass(WebsiteConfig);
WebsiteConfigSchema.index({ weddingId: 1 }, { unique: true });

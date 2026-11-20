import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * Every web address a wedding has used (decision 0017). The unique slug
 * index makes an address belong to one wedding for good: a changed one is
 * kept, so old links redirect to the new address and no other couple can
 * take it. `current` marks the one in use, which is also `weddings.slug`.
 */
@Schema({ collection: 'wedding_slugs', timestamps: { createdAt: true, updatedAt: false } })
export class WeddingSlug {
  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Boolean, required: true })
  current: boolean;

  createdAt: Date;
}

export type WeddingSlugDocument = HydratedDocument<WeddingSlug>;
export const WeddingSlugSchema = SchemaFactory.createForClass(WeddingSlug);
WeddingSlugSchema.index({ slug: 1 }, { unique: true });
WeddingSlugSchema.index({ weddingId: 1 });

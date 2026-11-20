import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * A wedding's vendor contact (schema document §4.10, PRD VEND-01 and
 * VEND-02): private to its owners and managers, never shown on public
 * pages. Never returned from a controller; see VendorDto.
 *
 * `eventIds` links the vendor to any number of the wedding's ceremonies,
 * so one photographer serves both Sangeet and Wedding as one record.
 */
@Schema({ collection: 'vendors', timestamps: true })
export class Vendor {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  /** Vendor or business name. Two vendors may share one. */
  @Prop({ type: String, required: true })
  name: string;

  /** Free text, usually one of the suggested categories (decision 0013). */
  @Prop({ type: String, required: true })
  category: string;

  /** The person to speak to. */
  @Prop({ type: String })
  contactName?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  address?: string;

  /** Private organiser notes. */
  @Prop({ type: String })
  notes?: string;

  /** The wedding's events it works at, without repeats; bounded by VENDOR_LIMITS.events. */
  @Prop({ type: [Types.ObjectId], default: [] })
  eventIds: Types.ObjectId[];

  /**
   * Set when an owner deletes the vendor (decision 0013). The record is
   * kept, so expenses that name it still can; it is no longer listed,
   * read or changed.
   */
  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId })
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type VendorDocument = HydratedDocument<Vendor>;
export const VendorSchema = SchemaFactory.createForClass(Vendor);

// Schema document §4.10: by name, by category, and by linked event.
VendorSchema.index({ weddingId: 1, name: 1 });
VendorSchema.index({ weddingId: 1, category: 1 });
VendorSchema.index({ weddingId: 1, eventIds: 1 });

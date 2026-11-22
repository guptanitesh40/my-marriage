import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * One email asking a guest for photos (decision 0019): which link it
 * carries, so the worker can rebuild it when sending, and stop if the link
 * was revoked meanwhile. The link itself is never stored.
 */
@Schema({ collection: 'upload_link_emails', timestamps: { createdAt: true, updatedAt: false } })
export class UploadLinkEmail {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  capabilityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  guestId: Types.ObjectId;

  /** The guest's name when asked, for the greeting. */
  @Prop({ type: String, required: true })
  guestName: string;

  @Prop({ type: String, required: true })
  emailNormalized: string;

  @Prop({ type: Types.ObjectId, required: true })
  notificationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  requestedBy: Types.ObjectId;

  createdAt: Date;
}

export type UploadLinkEmailDocument = HydratedDocument<UploadLinkEmail>;
export const UploadLinkEmailSchema = SchemaFactory.createForClass(UploadLinkEmail);
UploadLinkEmailSchema.index({ notificationId: 1 }, { unique: true });
UploadLinkEmailSchema.index({ weddingId: 1, createdAt: -1 });

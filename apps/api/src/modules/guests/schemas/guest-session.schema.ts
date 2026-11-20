import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * A guest's browser session after opening their link (schema document
 * §4.16): the cookie `mm_guest_session`, separate from organizer sessions.
 * It reaches only that guest's invitation, and only while the link that
 * opened it is active. Only the cookie's hash is stored.
 */
@Schema({ collection: 'guest_sessions', timestamps: { createdAt: true, updatedAt: false } })
export class GuestSession {
  @Prop({ type: Types.ObjectId, required: true })
  tokenId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  guestId: Types.ObjectId;

  @Prop({ type: String, required: true })
  sessionHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  revokedAt?: Date;

  createdAt: Date;
}

export type GuestSessionDocument = HydratedDocument<GuestSession>;
export const GuestSessionSchema = SchemaFactory.createForClass(GuestSession);

// Schema document §4.16: lookup by hash, by link, and removed once expired.
GuestSessionSchema.index({ sessionHash: 1 }, { unique: true });
GuestSessionSchema.index({ tokenId: 1, expiresAt: 1 });
GuestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * A wedding's automatic reminders (PRD INV-07, API "Configure wedding
 * reminders"). A wedding without a record has them off: switching them on
 * emails real guests, so the couple chooses it.
 */
@Schema({ collection: 'reminder_settings', timestamps: true })
export class ReminderSettings {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Boolean, required: true })
  enabled: boolean;

  /** Days before each ceremony: any of 30, 7 and 3. */
  @Prop({ type: [Number], required: true })
  offsetsDays: number[];

  @Prop({ type: Types.ObjectId, required: true })
  updatedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type ReminderSettingsDocument = HydratedDocument<ReminderSettings>;
export const ReminderSettingsSchema = SchemaFactory.createForClass(ReminderSettings);
ReminderSettingsSchema.index({ weddingId: 1 }, { unique: true });
ReminderSettingsSchema.index({ enabled: 1 });

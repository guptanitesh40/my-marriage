import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { REMINDER_NOTE_LIMIT, REMINDER_OFFSETS, type ReminderOffset } from '../guest-policy.js';

/** Which ceremonies a reminder covers: every upcoming one the guest is invited to, or one. */
export class ReminderScopeDto {
  @ApiProperty({ required: false, description: 'Remind about this ceremony only.' })
  @IsOptional()
  @IsMongoId({ message: 'Choose an upcoming ceremony.' })
  eventId?: string;
}

/** A reminder sent by hand (decision 0016), with the couple's optional note. */
export class SendReminderDto extends ReminderScopeDto {
  @ApiProperty({
    required: false,
    maxLength: REMINDER_NOTE_LIMIT,
    example: 'Please reply by 25 January.',
  })
  @IsOptional()
  @IsString({ message: 'Write the note as text.' })
  @MaxLength(REMINDER_NOTE_LIMIT, {
    message: `Keep the note to ${REMINDER_NOTE_LIMIT} characters.`,
  })
  note?: string;
}

/** Guests left out for one reason: how many, and the first names. */
export class SkippedGuestsDto {
  count: number;

  /** At most REMINDER_PREVIEW_NAMES, by name. */
  names: string[];
}

export class ReminderSkipsDto {
  /** No email address: share their link on WhatsApp instead. */
  noEmail: SkippedGuestsDto;

  /** The invitation was never shared: send it first. */
  notShared: SkippedGuestsDto;

  /** Their link is turned off. */
  linkOff: SkippedGuestsDto;

  /** The guest turned reminder emails off. */
  remindersOff: SkippedGuestsDto;
}

/** Who a reminder would go to, before sending; nothing is written. */
export class ReminderPreviewDto {
  /** Guests who would be emailed: one email each. */
  recipients: number;

  skipped: ReminderSkipsDto;

  /** Emails this wedding can still send today (shared with invitations). */
  emailsLeftToday: number;
}

export class ReminderResultDto {
  /** Reminder emails queued: one per guest. */
  queued: number;

  skipped: ReminderSkipsDto;
}

/** API "Configure wedding reminders" (NotificationSettings). */
export class ReminderSettingsDto {
  remindersEnabled: boolean;

  @ApiProperty({ type: [Number], enum: REMINDER_OFFSETS, example: [30, 7, 3] })
  reminderOffsetsDays: ReminderOffset[];

  /** Local time in each ceremony's time zone, `HH:mm`. */
  @ApiProperty({ example: '09:00' })
  sendTime: string;
}

export class UpdateReminderSettingsDto {
  @ApiProperty()
  @IsBoolean({ message: 'Choose whether reminders are on.' })
  remindersEnabled: boolean;

  @ApiProperty({ type: [Number], enum: REMINDER_OFFSETS, example: [30, 7, 3] })
  @ArrayMaxSize(REMINDER_OFFSETS.length)
  @IsIn(REMINDER_OFFSETS, { each: true, message: 'Choose 30, 7 or 3 days before.' })
  reminderOffsetsDays: ReminderOffset[];
}

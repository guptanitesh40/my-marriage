import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { WEBSITE_LIMITS, WEBSITE_TEMPLATES, type WebsiteTemplate } from '../website-policy.js';

const lineText = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : value,
);
const blockText = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.normalize('NFC').replace(/\r\n?/g, '\n').trim() : value,
);
const NO_CONTROL = /^[^\p{Cc}\p{Cf}]*$/u;
const NO_CONTROL_BLOCK = /^(?:[\n\t]|[^\p{Cc}\p{Cf}])*$/u;

/** One question for guests, with its answer. */
export class WebsiteFaqInputDto {
  @ApiProperty({ maxLength: WEBSITE_LIMITS.question, example: 'What should I wear?' })
  @lineText
  @IsString({ message: 'Enter the question.' })
  @MinLength(1, { message: 'Enter the question.' })
  @MaxLength(WEBSITE_LIMITS.question, {
    message: `Keep the question to ${WEBSITE_LIMITS.question} characters.`,
  })
  @Matches(NO_CONTROL, { message: 'Use letters, numbers and punctuation only.' })
  question: string;

  @ApiProperty({ maxLength: WEBSITE_LIMITS.answer, example: 'Festive Indian wear.' })
  @blockText
  @IsString({ message: 'Enter the answer.' })
  @MinLength(1, { message: 'Enter the answer.' })
  @MaxLength(WEBSITE_LIMITS.answer, {
    message: `Keep the answer to ${WEBSITE_LIMITS.answer} characters.`,
  })
  @Matches(NO_CONTROL_BLOCK, { message: 'Use letters, numbers and punctuation only.' })
  answer: string;
}

/** The website's own words; fields left out stay, `null` or empty clears one. */
export class WebsiteContentInputDto {
  @ApiProperty({
    required: false,
    nullable: true,
    maxLength: WEBSITE_LIMITS.headline,
    example: 'We’re getting married in Jaipur',
  })
  @lineText
  @IsOptional()
  @IsString({ message: 'Enter the welcome headline.' })
  @MaxLength(WEBSITE_LIMITS.headline, {
    message: `Keep the headline to ${WEBSITE_LIMITS.headline} characters.`,
  })
  @Matches(NO_CONTROL, { message: 'Use letters, numbers and punctuation only.' })
  headline?: string | null;

  /** Plain text; blank lines separate paragraphs. */
  @OptionalTextBlockField({
    maxLength: WEBSITE_LIMITS.story,
    example: 'We met in Mumbai…',
    nullable: true,
  })
  story?: string | null;

  /** The whole list, in order: it replaces the saved one. */
  @ApiProperty({ type: [WebsiteFaqInputDto], required: false })
  @IsOptional()
  @IsArray({ message: 'Send the questions as a list.' })
  @ArrayMaxSize(WEBSITE_LIMITS.faqItems, {
    message: `Add at most ${WEBSITE_LIMITS.faqItems} questions.`,
  })
  @ValidateNested({ each: true })
  @Type(() => WebsiteFaqInputDto)
  faq?: WebsiteFaqInputDto[];
}

/** A draft edit; never changes the public site until it is published. */
export class UpdateWebsiteDto {
  @ApiProperty({ enum: WEBSITE_TEMPLATES, required: false })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(WEBSITE_TEMPLATES, { message: 'Choose Traditional, Modern Minimal or Royal.' })
  templateId?: WebsiteTemplate;

  @ApiProperty({ type: WebsiteContentInputDto, required: false })
  @IsOptional()
  @IsObject({ message: 'Send the content as an object.' })
  @ValidateNested()
  @Type(() => WebsiteContentInputDto)
  content?: WebsiteContentInputDto;

  /** The version this edit started from; a newer one on the server is a conflict. */
  @ApiProperty({ type: 'integer', minimum: 0 })
  @IsInt({ message: 'Reload the page and try again.' })
  @Min(0, { message: 'Reload the page and try again.' })
  contentVersion: number;
}

/** Publishes the saved draft at this version (first publication or an update). */
export class PublishWebsiteDto {
  @ApiProperty({ type: 'integer', minimum: 0 })
  @IsInt({ message: 'Reload the page and try again.' })
  @Min(0, { message: 'Reload the page and try again.' })
  contentVersion: number;
}

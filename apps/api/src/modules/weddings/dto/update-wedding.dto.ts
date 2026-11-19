import { OptionalDateField, TextLineField } from './fields.js';

/** Changes to a wedding's details (PRD WED-04). Fields left out stay as they are. */
export class UpdateWeddingDto {
  @TextLineField({
    maxLength: 60,
    empty: "Enter the bride's name.",
    example: 'Ananya',
    optional: true,
  })
  brideName?: string;

  @TextLineField({
    maxLength: 60,
    empty: "Enter the groom's name.",
    example: 'Arjun',
    optional: true,
  })
  groomName?: string;

  @TextLineField({ maxLength: 80, empty: 'Enter the city.', example: 'Jaipur', optional: true })
  city?: string;

  @TextLineField({
    maxLength: 60,
    empty: 'Choose the state.',
    example: 'Rajasthan',
    optional: true,
  })
  state?: string;

  /** The wedding day; `null` removes it. A new date must not be in the past. */
  @OptionalDateField({ nullable: true })
  weddingDate?: string | null;
}

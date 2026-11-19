import { OptionalDateField, TextLineField } from './fields.js';

/**
 * The details needed to start a wedding workspace (PRD WED-01). Everything
 * else — venue, story, photos, the partner — can follow later. The web
 * address (slug) is chosen by the server from the names.
 */
export class CreateWeddingDto {
  @TextLineField({ maxLength: 60, empty: "Enter the bride's name.", example: 'Ananya' })
  brideName: string;

  @TextLineField({ maxLength: 60, empty: "Enter the groom's name.", example: 'Arjun' })
  groomName: string;

  @TextLineField({ maxLength: 80, empty: 'Enter the city.', example: 'Jaipur' })
  city: string;

  /** An Indian state or union territory, or "Outside India". */
  @TextLineField({ maxLength: 60, empty: 'Choose the state.', example: 'Rajasthan' })
  state: string;

  /** The wedding day, if already known. */
  @OptionalDateField()
  weddingDate?: string;
}

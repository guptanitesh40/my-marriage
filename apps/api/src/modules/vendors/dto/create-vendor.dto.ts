import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { TextLineField } from '../../weddings/dto/fields.js';
import { VENDOR_LIMITS } from '../vendor-policy.js';
import {
  EventIdsField,
  OptionalEmailField,
  OptionalLineField,
  OptionalPhoneField,
} from './fields.js';

export const NAME_EMPTY = 'Enter the vendor or business name.';
export const CATEGORY_EMPTY = 'Choose a service category.';

/**
 * A new vendor (PRD VEND-01, VEND-02). Only the name and category are
 * required; it may have no contact details and no events yet.
 */
export class CreateVendorDto {
  @TextLineField({
    maxLength: VENDOR_LIMITS.name,
    empty: NAME_EMPTY,
    example: 'The Marigold Studio',
  })
  name: string;

  /** Any text; the app suggests common ones, such as Catering (decision 0013). */
  @TextLineField({
    maxLength: VENDOR_LIMITS.category,
    empty: CATEGORY_EMPTY,
    example: 'Photography & Videography',
  })
  category: string;

  @OptionalLineField({ maxLength: VENDOR_LIMITS.contactName, example: 'Rohan Shah' })
  contactName?: string;

  @OptionalPhoneField()
  phone?: string;

  @OptionalEmailField()
  email?: string;

  @OptionalTextBlockField({
    maxLength: VENDOR_LIMITS.address,
    example: '402, Heritage Arts Enclave, C-Scheme, Jaipur',
  })
  address?: string;

  /** Private notes for the wedding's owners and managers. */
  @OptionalTextBlockField({
    maxLength: VENDOR_LIMITS.notes,
    example: 'Confirmed for 3 drones and 4 ground cinematographers.',
  })
  notes?: string;

  /** This wedding's events the vendor works at; none when left out. */
  @EventIdsField()
  eventIds?: string[];
}

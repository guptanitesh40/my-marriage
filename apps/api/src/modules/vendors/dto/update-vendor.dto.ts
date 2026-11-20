import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { TextLineField } from '../../weddings/dto/fields.js';
import { VENDOR_LIMITS } from '../vendor-policy.js';
import { CATEGORY_EMPTY, NAME_EMPTY } from './create-vendor.dto.js';
import {
  EventIdsField,
  OptionalEmailField,
  OptionalLineField,
  OptionalPhoneField,
} from './fields.js';

/**
 * Changes to a vendor (PRD VEND-01 to VEND-03). Fields left out stay as
 * they are; `null` or an empty string removes an optional one. `eventIds`
 * replaces the linked events: `[]` unlinks them all.
 */
export class UpdateVendorDto {
  @TextLineField({
    maxLength: VENDOR_LIMITS.name,
    empty: NAME_EMPTY,
    example: 'The Marigold Studio',
    optional: true,
  })
  name?: string;

  @TextLineField({
    maxLength: VENDOR_LIMITS.category,
    empty: CATEGORY_EMPTY,
    example: 'Photography & Videography',
    optional: true,
  })
  category?: string;

  @OptionalLineField({
    maxLength: VENDOR_LIMITS.contactName,
    example: 'Rohan Shah',
    nullable: true,
  })
  contactName?: string | null;

  @OptionalPhoneField({ nullable: true })
  phone?: string | null;

  @OptionalEmailField({ nullable: true })
  email?: string | null;

  @OptionalTextBlockField({
    maxLength: VENDOR_LIMITS.address,
    example: '402, Heritage Arts Enclave, C-Scheme, Jaipur',
    nullable: true,
  })
  address?: string | null;

  @OptionalTextBlockField({
    maxLength: VENDOR_LIMITS.notes,
    example: 'Confirmed for 3 drones and 4 ground cinematographers.',
    nullable: true,
  })
  notes?: string | null;

  /** Replaces the linked events; `[]` unlinks them all. */
  @EventIdsField()
  eventIds?: string[];
}

import { NotFoundException } from '@nestjs/common';
import { fieldError } from '../weddings/wedding-errors.js';

/** Also for a vendor of another wedding: isolation never says which. */
export function vendorNotFound(): NotFoundException {
  return new NotFoundException({ code: 'VENDOR_NOT_FOUND', message: 'Vendor not found.' });
}

/** One of the events is not this wedding's, or was deleted. */
export function unknownVendorEvents() {
  return fieldError('eventIds', 'Choose from this wedding’s events.');
}

/** A ceremony the vendor works at. */
export class VendorEventDto {
  id: string;

  title: string;
}

/**
 * A vendor as the wedding's owners and managers see it. Private: never
 * part of a public response.
 */
export class VendorDto {
  /** Vendor ID. */
  id: string;

  name: string;

  category: string;

  contactName?: string;

  phone?: string;

  email?: string;

  address?: string;

  notes?: string;

  /** Its ceremonies, in the wedding's order; deleted events are left out. */
  events: VendorEventDto[];

  createdAt: Date;

  updatedAt: Date;
}

export class VendorListDto {
  /** By name, A to Z. */
  vendors: VendorDto[];

  /** True when the wedding has more vendors than the list returns. */
  truncated: boolean;
}

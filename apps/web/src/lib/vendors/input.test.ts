import { describe, expect, it } from 'vitest';
import { isEmail, isPhone, vendorInputErrors, type VendorInput } from './input';

const empty: VendorInput = {
  name: '',
  category: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

describe('vendor input', () => {
  it('needs a name and a category, nothing else', () => {
    expect(Object.keys(vendorInputErrors(empty)).sort()).toEqual(['category', 'name']);
    expect(vendorInputErrors({ ...empty, name: 'Royal Bloom', category: 'Decoration' })).toEqual(
      {},
    );
  });

  it('checks a phone number and an email only when given', () => {
    const errors = vendorInputErrors({
      ...empty,
      name: 'A',
      category: 'B',
      phone: 'call me',
      email: 'rohan@',
    });
    expect(Object.keys(errors).sort()).toEqual(['email', 'phone']);
  });

  it('accepts the usual ways of writing a phone number', () => {
    for (const phone of ['+91 98201 44521', '(0141) 222-3344', '9820144521']) {
      expect(isPhone(phone), phone).toBe(true);
    }
    for (const phone of ['12345', '+91 98201 44521 99999', '98201x44521']) {
      expect(isPhone(phone), phone).toBe(false);
    }
  });

  it('accepts ordinary email addresses', () => {
    expect(isEmail('contact@vendor.in')).toBe(true);
    expect(isEmail('a.b+c@mail.example.co.in')).toBe(true);
    expect(isEmail('contact@vendor')).toBe(false);
    expect(isEmail('con tact@vendor.in')).toBe(false);
  });

  it('applies the API’s length limits', () => {
    const errors = vendorInputErrors({
      ...empty,
      name: 'x'.repeat(121),
      category: 'y'.repeat(61),
      notes: 'z'.repeat(4001),
    });
    expect(Object.keys(errors).sort()).toEqual(['category', 'name', 'notes']);
  });
});

import { describe, expect, it } from 'vitest';
import { guestInputErrors } from './input';

const blank = { name: '', partySize: '', email: '', phone: '', notes: '' };

describe('guest input', () => {
  it('needs a name and a party size from 1', () => {
    expect(Object.keys(guestInputErrors(blank)).sort()).toEqual(['name', 'partySize']);
    for (const partySize of ['0', '-1', '1.5', 'five', '101']) {
      expect(guestInputErrors({ ...blank, name: 'A', partySize }), partySize).toHaveProperty(
        'partySize',
      );
    }
    expect(guestInputErrors({ ...blank, name: 'Rajesh', partySize: '5' })).toEqual({});
  });

  it('checks an email and a phone only when given', () => {
    const errors = guestInputErrors({
      ...blank,
      name: 'A',
      partySize: '1',
      email: 'x@',
      phone: 'call',
    });
    expect(Object.keys(errors).sort()).toEqual(['email', 'phone']);
  });
});

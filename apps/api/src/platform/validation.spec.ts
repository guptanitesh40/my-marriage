import type { ValidationError } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toFieldErrors } from './validation.js';

describe('toFieldErrors', () => {
  it('flattens nested errors into dotted field paths', () => {
    const errors: ValidationError[] = [
      { property: 'email', constraints: { isEmail: 'email must be an email' } },
      {
        property: 'venue',
        children: [
          {
            property: 'name',
            constraints: { isString: 'name must be a string', minLength: 'name is too short' },
          },
        ],
      },
    ];
    expect(toFieldErrors(errors)).toEqual([
      { field: 'email', messages: ['email must be an email'] },
      { field: 'venue.name', messages: ['name must be a string', 'name is too short'] },
    ]);
  });
});

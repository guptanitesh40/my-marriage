import { describe, expect, it } from 'vitest';
import { duplicateKey, parseObjectId } from './mongo.js';

describe('duplicateKey', () => {
  it('reads the index from a duplicate-key error', () => {
    const error = Object.assign(new Error('E11000 duplicate key error index: emailNormalized_1'), {
      code: 11000,
      keyPattern: { emailNormalized: 1 },
    });
    expect(duplicateKey(error)).toEqual({
      keyPattern: { emailNormalized: 1 },
      message: 'E11000 duplicate key error index: emailNormalized_1',
    });
  });

  it('is null for any other error', () => {
    expect(duplicateKey(new Error('boom'))).toBeNull();
    expect(duplicateKey({ code: 112 })).toBeNull();
    expect(duplicateKey(null)).toBeNull();
  });
});

describe('parseObjectId', () => {
  it('accepts 24 hex characters', () => {
    expect(parseObjectId('6740a1b2c3d4e5f601234567')?.toHexString()).toBe(
      '6740a1b2c3d4e5f601234567',
    );
  });

  it('rejects anything else, including 12-character strings Mongoose would accept', () => {
    for (const id of [
      '',
      'abc',
      'twelve-chars',
      '6740a1b2c3d4e5f60123456z',
      '6740a1b2c3d4e5f6012345678',
    ]) {
      expect(parseObjectId(id), id).toBeNull();
    }
  });
});

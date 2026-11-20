import { describe, expect, it } from 'vitest';
import { landingWedding, ownedActiveWedding } from './choose';

const owned = { id: 'own', role: 'owner', status: 'active' } as const;
const archivedOwned = { id: 'old', role: 'owner', status: 'archived' } as const;
const managed = { id: 'help', role: 'manager', status: 'active' } as const;

describe('landingWedding', () => {
  it('opens the visitor’s own active wedding, even when a managed one is newer', () => {
    expect(landingWedding([managed, archivedOwned, owned])).toBe(owned);
  });

  it('otherwise opens the newest wedding they belong to', () => {
    expect(landingWedding([managed, archivedOwned])).toBe(managed);
    expect(landingWedding([archivedOwned])).toBe(archivedOwned);
  });

  it('has nothing to open without a wedding', () => {
    expect(landingWedding([])).toBeUndefined();
  });
});

describe('ownedActiveWedding', () => {
  it('ignores archived and managed weddings', () => {
    expect(ownedActiveWedding([archivedOwned, managed])).toBeUndefined();
  });
});

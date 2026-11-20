import { describe, expect, it } from 'vitest';
import { eventIcon, eventTone, EVENT_PRESETS } from './presets';

describe('presets', () => {
  it('are the PRD’s, in its order', () => {
    expect(EVENT_PRESETS.map((p) => p.name)).toEqual([
      'Haldi',
      'Mehendi',
      'Sangeet',
      'Garba',
      'Wedding',
      'Reception',
    ]);
  });

  it('give a name containing a preset that preset’s icon, and others a general one', () => {
    expect(eventIcon('Sangeet Sandhya')).toBe('music-note');
    expect(eventIcon('The Wedding (Vedic Pheras)')).toBe('favorite');
    expect(eventIcon('Royal reception')).toBe('wine-bar');
    expect(eventIcon('Housewarming')).toBe('event-upcoming');
    expect(eventIcon('Weddingcake tasting')).toBe('event-upcoming');
  });

  it('give common ceremonies that are not presets a fitting icon, and each its colour', () => {
    expect(eventIcon('Tilak')).toBe('temple-hindu');
    expect(eventIcon('Matkor')).toBe('potted-plant');
    expect(eventIcon('Vidaai')).toBe('waving-hand');
    expect(eventIcon('Roka ceremony')).toBe('diamond');
    expect(eventTone('Wedding')).toBe('main');
    expect(eventTone('Haldi')).toBe('warm');
    expect(eventTone('Mehendi')).toBe('green');
    expect(eventTone('Something new')).toBe('neutral');
  });
});

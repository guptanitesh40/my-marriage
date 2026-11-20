import type { IconName } from '@/components/ui/icon';

/** The colours of a ceremony's timeline marker and day chip (Stitch "Events Management"). */
export type EventTone = 'warm' | 'green' | 'brown' | 'gold' | 'main' | 'neutral';

/**
 * The ceremonies offered as presets (PRD EVT-01), each with the icon and
 * colour the Stitch design gives it. A preset only fills in the name: any
 * name works, and nothing limits how many or in what order.
 */
export const EVENT_PRESETS = [
  { name: 'Haldi', icon: 'spa', tone: 'warm' },
  { name: 'Mehendi', icon: 'local-florist', tone: 'green' },
  { name: 'Sangeet', icon: 'music-note', tone: 'brown' },
  { name: 'Garba', icon: 'celebration', tone: 'gold' },
  { name: 'Wedding', icon: 'favorite', tone: 'main' },
  { name: 'Reception', icon: 'wine-bar', tone: 'neutral' },
] as const satisfies readonly { name: string; icon: IconName; tone: EventTone }[];

/**
 * Other ceremonies people often add, matched by a word in the name, so
 * they get a fitting icon too. Not presets: any name still works.
 */
const OTHER_CEREMONIES: readonly { words: readonly string[]; icon: IconName; tone: EventTone }[] = [
  { words: ['tilak', 'puja', 'pooja', 'ganesh'], icon: 'temple-hindu', tone: 'gold' },
  { words: ['matkor', 'mandap'], icon: 'potted-plant', tone: 'green' },
  { words: ['vidaai', 'vidai', 'bidaai'], icon: 'waving-hand', tone: 'warm' },
  { words: ['engagement', 'roka', 'sagai', 'ring'], icon: 'diamond', tone: 'brown' },
  { words: ['cocktail', 'party'], icon: 'local-bar', tone: 'neutral' },
  { words: ['baraat', 'sangeet'], icon: 'music-note', tone: 'brown' },
];

function words(title: string): Set<string> {
  return new Set(title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function lookup(title: string): { icon: IconName; tone: EventTone } {
  const named = words(title);
  const preset = EVENT_PRESETS.find((p) => named.has(p.name.toLowerCase()));
  if (preset) return preset;
  const other = OTHER_CEREMONIES.find((c) => c.words.some((word) => named.has(word)));
  return other ?? { icon: 'event-upcoming', tone: 'neutral' };
}

/** The icon for an event's name: its preset's, if the name contains one ("Sangeet Sandhya"). */
export function eventIcon(title: string): IconName {
  return lookup(title).icon;
}

/** The colour for an event's name, as the design gives each ceremony its own. */
export function eventTone(title: string): EventTone {
  return lookup(title).tone;
}

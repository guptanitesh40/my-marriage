import type { IconName } from '@/components/ui/icon';

/**
 * Homepage copy. The Stitch design set the layout and tone; every claim here
 * was checked against docs/reference/PRD_v1.0.md, which wins where they
 * differ. Do not promise a feature the PRD does not include.
 */

/**
 * Each step and card has an id, and its component maps every id to a
 * mock-up with a Record, so adding a card without its mock-up — or
 * reordering cards — cannot mismatch them.
 */
export type HowItWorksStepId = 'create' | 'plan' | 'share';
export type GuestCardId = 'invite-link' | 'rsvp' | 'photos';

export const hero = {
  eyebrow: 'The modern Indian wedding planner',
  title: 'Every celebration.',
  accent: 'One beautiful plan.',
  intro:
    'From Haldi to Reception, plan every ceremony in one place. Share tasks, vendors and expenses with your family, track RSVPs event by event, and publish a wedding website that feels like you.',
  primaryCta: 'Start planning free',
  secondaryCta: 'See how it works',
  reassurance: 'Free to start. Invite your partner and plan together.',
} as const;

export const celebrations = {
  eyebrow: 'Every ceremony, its own plan',
  title: 'One wedding.',
  accent: 'So many beautiful moments.',
  intro:
    'Each ceremony keeps its own date, venue, schedule, tasks and guest list — without losing sight of the whole celebration.',
} as const;

export const planningFeatures = {
  eyebrow: 'Plan together',
  title: 'All the details.',
  accent: 'None of the chaos.',
  intro:
    'Built around how Indian weddings really come together — two equal owners, family members pitching in, and many ceremonies across many venues.',
  tabs: {
    tasks: 'Tasks',
    expenses: 'Vendors & expenses',
    guests: 'Guests by ceremony',
  },
  highlights: [
    { icon: 'group-add', label: 'Two equal owners' },
    { icon: 'supervisor-account', label: 'Family members as managers' },
    { icon: 'currency-rupee', label: 'Payments and outstanding amounts' },
  ] satisfies { icon: IconName; label: string }[],
} as const;

export const howItWorks = {
  eyebrow: 'How it works',
  title: 'From “we’re getting married” to',
  accent: 'beautifully organised.',
  intro: 'Three simple steps, starting the day you decide.',
  steps: [
    {
      id: 'create',
      title: 'Create your wedding',
      body: 'Start with just your names and city — dates and venues can come later. Add ceremonies from Haldi, Mehendi and Sangeet presets, or name your own.',
    },
    {
      id: 'plan',
      title: 'Plan together with family',
      body: 'Invite your partner as an equal co-owner, and bring in family as managers to share events, tasks, vendors and guest lists.',
    },
    {
      id: 'share',
      title: 'Celebrate and share',
      body: 'Publish your wedding website, collect RSVPs for each ceremony separately, and gather guests’ photos with a QR code for every event.',
    },
  ] satisfies { id: HowItWorksStepId; title: string; body: string }[],
} as const;

export const weddingWebsites = {
  eyebrow: 'Wedding websites',
  title: 'Your story deserves a',
  accent: 'beautiful home.',
  intro:
    'Three templates share the same content, so you can switch designs at any time without losing a word.',
  templates: [
    {
      id: 'traditional',
      name: 'Traditional',
      description: 'Warm sandstone tones, classic serif type and floral framing.',
      style: 'Heritage & warm terracotta',
    },
    {
      id: 'modern',
      name: 'Modern Minimal',
      description: 'High-contrast, contemporary type with crisp geometric balance.',
      style: 'Minimalist monochrome',
    },
    {
      id: 'royal',
      name: 'Royal Elegant',
      description: 'Deep forest green with muted champagne accents.',
      style: 'Palace noir',
    },
  ],
} as const;

export const guestExperience = {
  eyebrow: 'Effortless for guests',
  title: 'Bring everyone together.',
  accent: 'Beautifully.',
  intro: 'No app downloads and no passwords. Easy for elders and out-of-town guests alike.',
  cards: [
    {
      id: 'invite-link',
      icon: 'forward-to-inbox',
      title: 'One link per household',
      body: 'Invite a family as one contact with one party size. Send their private link by email or share it on WhatsApp — guests never need an account.',
    },
    {
      id: 'rsvp',
      icon: 'fact-check',
      title: 'RSVPs for each ceremony',
      body: 'Choose which ceremonies each family is invited to. They reply to each one separately, and you see how many people are coming to every event.',
    },
    {
      id: 'photos',
      icon: 'photo-library',
      title: 'Photos you approve',
      body: 'Share a QR code for each ceremony. Guests upload photos without signing in, and nothing appears on your website until you approve it.',
    },
  ] satisfies { id: GuestCardId; icon: IconName; title: string; body: string }[],
} as const;

export const trust = {
  eyebrow: 'Honest foundations',
  title: 'Everything you need to begin.',
  accent: 'Nothing you don’t.',
  intro: 'No ads on your invitations or gallery, no vendor commissions, no pressure tactics.',
  items: [
    {
      icon: 'verified',
      title: 'Free during our early pilot',
      body: 'Every feature is free while we pilot with our first couples. No credit card needed.',
    },
    {
      icon: 'supervisor-account',
      title: 'Two equal owners',
      body: 'Both partners have the same control over planning, guests and the wedding website.',
    },
    {
      icon: 'admin-panel-settings',
      title: 'Family helps, owners decide',
      body: 'Managers help with events, tasks, guests and photos. Only owners can archive the wedding or change who owns it.',
    },
    {
      icon: 'no-accounts',
      title: 'No guest accounts',
      body: 'Guests open their private link and reply for each ceremony — no sign-up and no password.',
    },
    {
      icon: 'cloud-done',
      title: '5 GB of photo storage',
      body: 'Each wedding gets 5 GB for photos, kept in original quality so you can download them later.',
    },
    {
      icon: 'security',
      title: 'You approve what’s public',
      body: 'Guest photos stay private until you or one of your managers approves them.',
    },
  ] satisfies { icon: IconName; title: string; body: string }[],
} as const;

export const finalCta = {
  eyebrow: 'Start today',
  title: 'Your celebration starts with a',
  accent: 'beautiful plan.',
  intro:
    'Less time juggling spreadsheets and WhatsApp groups. More time being present for every ritual.',
  cta: 'Start planning free',
} as const;

export const faq = {
  eyebrow: 'Questions',
  title: 'Frequently asked questions',
  items: [
    {
      question: 'Is My Marriage free to use?',
      answer:
        'Yes. My Marriage is free during our early pilot, including ceremony planning, RSVPs, your wedding website and 5 GB of photo storage per wedding.',
    },
    {
      question: 'Can my partner and family help plan?',
      answer:
        'Yes. Your partner joins as an equal co-owner, and you can invite family or friends as managers. Managers can help with events, tasks, vendors, expenses, guests and photos. Only owners can archive or delete the wedding, or change who owns it.',
    },
    {
      question: 'Do guests need an account or app to RSVP?',
      answer:
        'No. Each household gets a private invitation link by email, or you can share it on WhatsApp. Anyone who has the link can view that invitation and reply, so share it only with the family it is meant for.',
    },
    {
      question: 'Can we plan several ceremonies separately?',
      answer:
        'Yes. Haldi, Mehendi, Sangeet, the wedding, the reception — or any ceremony you name — each has its own date, venue, schedule and guest list, and guests are invited ceremony by ceremony.',
    },
    {
      question: 'Can we start before our dates are fixed?',
      answer:
        'Yes. You only need your names and city to begin. Dates, venues and other details can be added whenever they are decided.',
    },
    {
      question: 'How do guests share their photos?',
      answer:
        'Each ceremony has its own QR code and upload link. Guests upload photos from their phone without signing in, and every photo waits for your approval before it appears on your wedding website.',
    },
  ],
} as const;

export const footer = {
  tagline: 'Wedding planning and websites for modern Indian celebrations.',
  signoff: 'Designed for serene multi-day celebrations.',
} as const;

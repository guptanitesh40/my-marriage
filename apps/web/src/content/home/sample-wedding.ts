/**
 * The fictional wedding shown in every homepage mock-up. One source, so the
 * hero, the ceremony cards and the previews all tell the same story.
 *
 * Everything here is invented example data — and it must still obey the
 * product's rules (docs/reference/PRD_v1.0.md), because the homepage is a
 * promise about how the product behaves. sample-wedding.test.ts checks the
 * rules that numbers can break.
 */

export const couple = {
  names: 'Ananya & Arjun',
  initials: 'A&A',
  slug: 'ananya-arjun',
  city: 'Jaipur',
  dates: 'Dec 10–14, 2027',
  daysToGo: 218,
} as const;

export type CeremonyTone = 'turmeric' | 'mint' | 'gold' | 'highlight' | 'stone';

export interface Ceremony {
  name: string;
  day: string;
  when: string;
  shortDate: string;
  venue: string;
  shortVenue: string;
  /** Sum of party sizes of the guest contacts invited to this ceremony. */
  invitedPeople: number;
  /** Sum of attending counts of RSVPs marked attending. */
  confirmedPeople: number;
  /** Invited contacts who have not replied yet. */
  pendingContacts: number;
  tasksDone: number;
  tasksTotal: number;
  managedBy: string;
  tone: CeremonyTone;
}

export const ceremonies: Ceremony[] = [
  {
    name: 'Haldi',
    day: 'Day 01',
    when: 'Morning, Dec 10',
    shortDate: 'Dec 10',
    venue: 'Poolside Courtyard',
    shortVenue: 'Poolside',
    invitedPeople: 140,
    confirmedPeople: 96,
    pendingContacts: 9,
    tasksDone: 6,
    tasksTotal: 6,
    managedBy: 'Arjun · Groom',
    tone: 'turmeric',
  },
  {
    name: 'Mehendi',
    day: 'Day 02',
    when: 'Afternoon, Dec 11',
    shortDate: 'Dec 11',
    venue: 'The Haveli Lawns',
    shortVenue: 'Lawns',
    invitedPeople: 180,
    confirmedPeople: 131,
    pendingContacts: 14,
    tasksDone: 4,
    tasksTotal: 5,
    managedBy: 'Ritu · Sister',
    tone: 'mint',
  },
  {
    name: 'Sangeet',
    day: 'Day 03',
    when: 'Evening, Dec 12',
    shortDate: 'Dec 12',
    venue: 'Grand Ballroom',
    shortVenue: 'Ballroom',
    invitedPeople: 350,
    confirmedPeople: 262,
    pendingContacts: 31,
    tasksDone: 3,
    tasksTotal: 5,
    managedBy: 'Ananya · Bride',
    tone: 'gold',
  },
  {
    name: 'Wedding',
    day: 'Day 04 · Muhurat',
    when: 'Sunset, Dec 13',
    shortDate: 'Dec 13',
    venue: 'The Mandapam',
    shortVenue: 'Mandap',
    invitedPeople: 400,
    confirmedPeople: 342,
    pendingContacts: 12,
    tasksDone: 3,
    tasksTotal: 5,
    managedBy: 'Uncle Rajesh',
    tone: 'highlight',
  },
  {
    name: 'Reception',
    day: 'Day 05',
    when: 'Night, Dec 14',
    shortDate: 'Dec 14',
    venue: 'Palace Gardens',
    shortVenue: 'Palace',
    invitedPeople: 450,
    confirmedPeople: 298,
    pendingContacts: 48,
    tasksDone: 2,
    tasksTotal: 3,
    managedBy: 'Arjun & Ananya',
    tone: 'stone',
  },
];

/** Dashboard figures shown in the hero (DASH-01). */
export const dashboard = {
  tasksDone: 18,
  tasksTotal: 24,
  featuredCeremony: 'Wedding',
  contactsRepliedPercent: 92,
  recordedExpenses: '₹48.2L',
  outstanding: '₹12.6L',
} as const;

/** One household's RSVP, as shown in the hero activity row. */
export const recentReply = {
  initials: 'AS',
  household: 'Aarav Sharma & Family',
  attending: 4,
  ceremonies: 'Sangeet, Wedding & Reception',
} as const;

export type TaskState = 'todo' | 'in_progress' | 'completed';

export interface SampleTask {
  title: string;
  detail: string;
  ceremony: string;
  state: TaskState;
  meta: string;
  assignee?: { name: string; initials: string; tone: 'primary' | 'secondary' | 'neutral' };
  icon: 'flag' | 'sync' | 'payments' | 'flight-land' | 'check-circle';
}

/** The task board preview. Column counts below must add up to dashboard.tasksTotal. */
export const taskColumns: { state: TaskState; label: string; count: number }[] = [
  { state: 'todo', label: 'To do', count: 2 },
  { state: 'in_progress', label: 'In progress', count: 4 },
  { state: 'completed', label: 'Completed', count: 18 },
];

export const tasks: SampleTask[] = [
  {
    title: 'Book folk troupe for the baraat',
    detail: 'Procession: 4 dholis and 2 shehnai players.',
    ceremony: 'Wedding',
    state: 'todo',
    meta: 'Due Nov 20',
    assignee: { name: 'Uncle Rajesh', initials: 'UR', tone: 'neutral' },
    icon: 'payments',
  },
  {
    title: 'Airport transfer list',
    detail: 'Group arrivals into 4 coach runs from Jaipur airport.',
    ceremony: 'Hospitality',
    state: 'todo',
    meta: 'Due Nov 28',
    assignee: { name: 'Arjun', initials: 'AR', tone: 'primary' },
    icon: 'flight-land',
  },
  {
    title: 'Approve Mehendi favour packaging',
    detail: 'Review sample potli bags from the block-print supplier.',
    ceremony: 'Mehendi',
    state: 'in_progress',
    meta: 'Due Dec 01',
    assignee: { name: 'Ananya', initials: 'AN', tone: 'primary' },
    icon: 'flag',
  },
  {
    title: 'Finalise Sangeet track edits',
    detail: '6 family medleys and the couple’s entry music.',
    ceremony: 'Sangeet',
    state: 'in_progress',
    meta: 'Due Dec 04',
    assignee: { name: 'Arjun', initials: 'AR', tone: 'secondary' },
    icon: 'sync',
  },
  {
    title: 'Hotel room block signed',
    detail: '75 rooms confirmed for out-of-town family.',
    ceremony: 'All ceremonies',
    state: 'completed',
    meta: 'Completed by Ananya',
    icon: 'check-circle',
  },
  {
    title: 'Marigold décor confirmed',
    detail: 'Brass urli décor and flower petals for the courtyard.',
    ceremony: 'Haldi',
    state: 'completed',
    meta: 'Completed by Ritu',
    icon: 'check-circle',
  },
];

export interface SampleExpense {
  title: string;
  vendor: string;
  ceremonies: string;
  /** Whole rupees. Real expenses are stored in integer paise; this is display data. */
  totalRupees: number;
  paidRupees: number;
}

/** PRD EXP acceptance example: ₹80,000 with ₹30,000 paid leaves ₹50,000 outstanding. */
export const expenses: SampleExpense[] = [
  {
    title: 'Wedding photography',
    vendor: 'Lens & Light Studio',
    ceremonies: 'Sangeet, Wedding',
    totalRupees: 80000,
    paidRupees: 30000,
  },
  {
    title: 'Sangeet choreography',
    vendor: 'Step Up Dance Co.',
    ceremonies: 'Sangeet',
    totalRupees: 120000,
    paidRupees: 120000,
  },
  {
    title: 'Mehendi artists',
    vendor: 'Henna by Farah',
    ceremonies: 'Mehendi',
    totalRupees: 45000,
    paidRupees: 15000,
  },
];

export type RsvpStatus = 'attending' | 'not_attending' | 'maybe' | 'pending';

/**
 * One guest contact representing a household (PRD journey J2): a single
 * party size shared by every ceremony they are invited to, and a separate
 * reply for each.
 */
export const sampleHousehold = {
  name: 'Mehta family',
  partySize: 5,
  invitations: [
    { ceremony: 'Haldi', status: 'attending' as RsvpStatus, attending: 3 },
    { ceremony: 'Wedding', status: 'attending' as RsvpStatus, attending: 5 },
  ],
  notInvited: ['Reception'],
};

/** The household shown in the guest-experience card. */
export const linkHousehold = {
  name: 'Verma family',
  partySize: 4,
  replies: [
    { ceremony: 'Mehendi', attending: 4 },
    { ceremony: 'Sangeet', attending: 3 },
  ],
  notInvited: ['Haldi'],
};

export const photoQueue = { uploads: 142, toReview: 12 } as const;

export const team = {
  owners: 2,
  managers: 3,
  sampleManager: { name: 'Ritu (Sister)', initial: 'R' },
} as const;

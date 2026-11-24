import type { components } from '@my-marriage/contracts';

type Role = components['schemas']['WeddingDto']['role'];

/**
 * What each role may do, in the words the invitation and team pages use
 * (decision 0020). Display only: the API decides what is allowed.
 */
export const ROLE_SCOPE: Record<Role, { title: string; can: string[]; cannot: string }> = {
  owner: {
    title: 'Owner',
    can: ['Everything in the wedding, with the same rights as the other owner'],
    cannot: 'Only owners can invite the partner or archive the wedding.',
  },
  admin: {
    title: 'Admin',
    can: [
      'Plan events, tasks, guests, vendors, expenses, the website and photos',
      'Invite, remove and change admins and managers',
      'Delete events, guests, vendors and expenses',
    ],
    cannot: 'The bride and groom stay the owners: admins can’t remove them or archive the wedding.',
  },
  manager: {
    title: 'Manager',
    can: [
      'Coordinate events, the schedule and tasks',
      'Work with vendors and track expenses',
      'Look after guests and RSVPs, the website and photos',
    ],
    cannot: 'Managers don’t manage the team, delete records or change the couple’s settings.',
  },
};

/** Whether the role manages the team (owners and admins). */
export function managesTeam(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

import { ApiProperty } from '@nestjs/swagger';
import { EventRsvpTotalsDto } from '../../guests/dto/guest.dto.js';
import { TaskDto } from '../../tasks/dto/task.dto.js';
import { WeddingDto } from '../../weddings/dto/wedding.dto.js';

/** The overview's sections, each loaded on its own. */
export const DASHBOARD_SECTIONS = [
  'ceremonies',
  'tasks',
  'expenses',
  'guests',
  'photos',
  'website',
  'team',
] as const;
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

/** A ceremony still to come. */
export class DashboardCeremonyDto {
  id: string;

  title: string;

  /** `YYYY-MM-DD` in the ceremony's time zone. */
  @ApiProperty({ format: 'date', example: '2027-02-12' })
  startDate: string;

  /** `HH:mm` in the ceremony's time zone; missing when only the day is known. */
  @ApiProperty({ required: false, example: '10:30' })
  startTime?: string;

  timeZone: string;

  venueName?: string;

  dressCode?: string;

  /**
   * People confirmed (attending counts only). Missing when the guest
   * totals could not be loaded, which is not the same as none.
   */
  confirmedPeople?: number;
}

export class DashboardCeremoniesDto {
  /** Scheduled ceremonies from today on: not cancelled, not completed. */
  upcoming: number;

  /** Scheduled ceremonies without a day yet. */
  undated: number;

  /** The next few, soonest first. */
  next: DashboardCeremonyDto[];
}

export class DashboardTasksDto {
  /** To do or in progress. */
  open: number;

  overdue: number;

  /** Due today or in the next 7 days (India time), and not overdue yet. */
  dueSoon: number;

  /** The first few open tasks: overdue first, then soonest due, then priority. */
  attention: TaskDto[];
}

export class DashboardCategoryDto {
  category: string;

  /** Recorded (final) amount in integer paise. */
  finalPaise: number;

  /** Expenses in it. */
  count: number;
}

export class DashboardExpensesDto {
  /** Recorded: agreed − discounts + extras, in integer paise. */
  finalPaise: number;

  paidPaise: number;

  outstandingPaise: number;

  /** Expenses past their due day with something still to pay. */
  overdue: number;

  count: number;

  /** The categories with the most recorded spending, largest first. */
  topCategories: DashboardCategoryDto[];
}

export class DashboardGuestsDto {
  /** Guest contacts (families or groups). */
  contacts: number;

  /** People invited to at least one ceremony, each counted once. */
  invitedPeople: number;

  /** Ceremony invitations answered (attending, not attending or maybe). */
  answered: number;

  /** Ceremony invitations not answered yet. */
  pending: number;

  /** Per ceremony, in the wedding's order; deleted ceremonies left out. */
  events: EventRsvpTotalsDto[];
}

export class DashboardPhotosDto {
  awaitingReview: number;

  approved: number;

  /** Photos kept, in bytes. */
  usedBytes: number;

  /** The wedding's storage allowance, in bytes. */
  limitBytes: number;
}

export class DashboardWebsiteDto {
  /** Published and online. */
  published: boolean;

  /** The public address's last part, `/w/{slug}`. */
  slug: string;
}

export class DashboardTeamDto {
  owners: number;

  admins: number;

  managers: number;

  /** Invitations waiting for an answer: only for owners and admins, who manage the team. */
  pendingInvites?: number;
}

/**
 * The wedding overview (PRD DASH-01 to DASH-03, decision 0022). Each section
 * is loaded on its own: one that fails is left out and named in
 * `unavailable`, so the page can say so instead of showing zero.
 */
export class DashboardDto {
  wedding: WeddingDto;

  /** Today in India (`YYYY-MM-DD`), the day the countdown is measured from. */
  @ApiProperty({ format: 'date', example: '2026-11-23' })
  today: string;

  ceremonies?: DashboardCeremoniesDto;

  tasks?: DashboardTasksDto;

  expenses?: DashboardExpensesDto;

  guests?: DashboardGuestsDto;

  photos?: DashboardPhotosDto;

  website?: DashboardWebsiteDto;

  team?: DashboardTeamDto;

  /** Sections that could not be loaded this time. */
  @ApiProperty({ enum: DASHBOARD_SECTIONS, isArray: true })
  unavailable: DashboardSection[];
}

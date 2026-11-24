import { Injectable, Logger } from '@nestjs/common';
import type { Types } from 'mongoose';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { todayIn, zonedInstant } from '../events/event-time.js';
import { EventsService, type EventBrief } from '../events/events.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';
import type { GuestTotalsDto } from '../guests/dto/guest.dto.js';
import { GuestsService } from '../guests/guests.service.js';
import { ModerationService } from '../media/moderation.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { WebsiteService } from '../website/website.service.js';
import { MemberInvitesService } from '../weddings/member-invites.service.js';
import { ADMIN_ROLES } from '../weddings/schemas/wedding-membership.schema.js';
import { WeddingAccessService, type WeddingAccess } from '../weddings/wedding-access.service.js';
import { todayInIndia } from '../weddings/wedding-policy.js';
import { toWeddingDto } from '../weddings/wedding-records.js';
import {
  DASHBOARD_SECTIONS,
  type DashboardCeremoniesDto,
  type DashboardDto,
  type DashboardExpensesDto,
  type DashboardPhotosDto,
  type DashboardSection,
  type DashboardTasksDto,
  type DashboardTeamDto,
  type DashboardWebsiteDto,
} from './dto/dashboard.dto.js';

/** How many ceremonies and tasks the overview lists, and how many expense categories. */
export const DASHBOARD_LIMITS = { ceremonies: 4, tasks: 4, categories: 3 } as const;

/**
 * The wedding overview (PRD DASH-01 to DASH-03, decision 0022): one read
 * for any member, archived or not, built from each module's own read
 * methods so the numbers match the pages they link to. Every section is
 * loaded on its own; one that fails is named in `unavailable` and the rest
 * still load.
 */
@Traced()
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly tasks: TasksService,
    private readonly expenses: ExpensesService,
    private readonly guests: GuestsService,
    private readonly moderation: ModerationService,
    private readonly website: WebsiteService,
    private readonly invites: MemberInvitesService,
  ) {}

  async get(user: AuthenticatedUser, weddingId: string): Promise<DashboardDto> {
    const access = await this.access.require(user, weddingId);
    const id = access.wedding._id;
    const now = new Date();
    const unavailable: DashboardSection[] = [];
    const load = <T>(section: DashboardSection, work: () => Promise<T>) =>
      this.section(id, section, unavailable, work);

    const [briefs, guests, tasks, expenses, photos, website, team] = await Promise.all([
      load('ceremonies', () => this.events.briefs(id)),
      load('guests', () => this.guests.totals(id)),
      load('tasks', () => this.tasksOf(id, now)),
      load('expenses', () => this.expensesOf(id)),
      load('photos', () => this.photosOf(access)),
      load('website', () => this.websiteOf(access)),
      load('team', () => this.teamOf(access, now)),
    ]);

    return {
      wedding: toWeddingDto(access.wedding, access.role),
      today: todayInIndia(now),
      ...(briefs ? { ceremonies: this.ceremoniesOf(briefs, guests, now) } : {}),
      ...(tasks ? { tasks } : {}),
      ...(expenses ? { expenses } : {}),
      ...(guests ? { guests } : {}),
      ...(photos ? { photos } : {}),
      ...(website ? { website } : {}),
      ...(team ? { team } : {}),
      // In the page's order, whichever failed first.
      unavailable: [...unavailable].sort(
        (a, b) => DASHBOARD_SECTIONS.indexOf(a) - DASHBOARD_SECTIONS.indexOf(b),
      ),
    };
  }

  /**
   * Runs one section's reads. A failure is logged and the section left out,
   * so one slow or broken module never takes the whole overview down.
   */
  private async section<T>(
    weddingId: Types.ObjectId,
    section: DashboardSection,
    unavailable: DashboardSection[],
    work: () => Promise<T>,
  ): Promise<T | undefined> {
    try {
      return await work();
    } catch (error) {
      this.logger.warn('Overview section unavailable', {
        weddingId: weddingId.toHexString(),
        section,
        error: error instanceof Error ? error.name : 'unknown',
      });
      unavailable.push(section);
      return undefined;
    }
  }

  /**
   * Scheduled ceremonies from today on, each judged by the day in its own
   * time zone, soonest first. A ceremony keeps its place until its day is
   * over, so the wedding day still shows it.
   */
  ceremoniesOf(
    briefs: readonly EventBrief[],
    guests: GuestTotalsDto | undefined,
    now: Date,
  ): DashboardCeremoniesDto {
    const live = briefs.filter((event) => !event.deleted && !event.cancelled && !event.completed);
    const upcoming = live
      .flatMap((event) =>
        event.startDate && event.startDate >= todayIn(event.timeZone, now)
          ? [{ event, startDate: event.startDate }]
          : [],
      )
      .map(({ event, startDate }) => ({
        event,
        startDate,
        at: zonedInstant(startDate, event.startTime ?? '00:00', event.timeZone).getTime(),
      }))
      .sort((a, b) => a.at - b.at);
    const confirmed = new Map(
      (guests?.events ?? []).map((totals) => [totals.eventId, totals.confirmedPeople]),
    );
    return {
      upcoming: upcoming.length,
      undated: live.filter((event) => !event.startDate).length,
      next: upcoming.slice(0, DASHBOARD_LIMITS.ceremonies).map(({ event, startDate }) => {
        const people = guests ? (confirmed.get(event.id) ?? 0) : undefined;
        return {
          id: event.id,
          title: event.title,
          startDate,
          ...(event.startTime ? { startTime: event.startTime } : {}),
          timeZone: event.timeZone,
          ...(event.venueName ? { venueName: event.venueName } : {}),
          ...(event.dressCode ? { dressCode: event.dressCode } : {}),
          ...(people !== undefined ? { confirmedPeople: people } : {}),
        };
      }),
    };
  }

  private async tasksOf(weddingId: Types.ObjectId, now: Date): Promise<DashboardTasksDto> {
    const { open, overdue, dueSoon, tasks } = await this.tasks.attention(
      weddingId,
      now,
      DASHBOARD_LIMITS.tasks,
    );
    return { open, overdue, dueSoon, attention: tasks };
  }

  private async expensesOf(weddingId: Types.ObjectId): Promise<DashboardExpensesDto> {
    const [totals, topCategories] = await Promise.all([
      this.expenses.totalsOf(weddingId),
      this.expenses.topCategories(weddingId, DASHBOARD_LIMITS.categories),
    ]);
    return {
      finalPaise: totals.finalPaise,
      paidPaise: totals.paidPaise,
      outstandingPaise: totals.outstandingPaise,
      overdue: totals.overdue,
      count: totals.count,
      topCategories,
    };
  }

  private async photosOf({ wedding }: WeddingAccess): Promise<DashboardPhotosDto> {
    const counts = await this.moderation.counts(wedding._id);
    return {
      ...counts,
      usedBytes: wedding.quota.usedBytes,
      limitBytes: wedding.quota.limitBytes,
    };
  }

  private async websiteOf({ wedding }: WeddingAccess): Promise<DashboardWebsiteDto> {
    // Null while a draft, and while the wedding waits to be deleted (offline).
    const address = await this.website.publishedAddress(wedding._id);
    return { published: address !== null, slug: wedding.slug };
  }

  private async teamOf({ wedding, role }: WeddingAccess, now: Date): Promise<DashboardTeamDto> {
    const managesTeam = (ADMIN_ROLES as readonly string[]).includes(role);
    const [members, pendingInvites] = await Promise.all([
      this.access.activeMembers(wedding._id),
      managesTeam ? this.invites.pendingCount(wedding._id, now) : Promise.resolve(undefined),
    ]);
    const count = (wanted: string) => members.filter((member) => member.role === wanted).length;
    return {
      owners: count('owner'),
      admins: count('admin'),
      managers: count('manager'),
      ...(pendingInvites !== undefined ? { pendingInvites } : {}),
    };
  }
}

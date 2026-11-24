import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Types, type Connection } from 'mongoose';
import { AuditService } from '../../platform/audit/audit.service.js';
import { parseObjectId } from '../../platform/mongo.js';
import { Traced } from '../../platform/tracing.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import type { TeamDto, TeamMemberDto } from '../weddings/dto/team.dto.js';
import type { UpdateMemberDto } from '../weddings/dto/update-member.dto.js';
import { MemberInvitesService } from '../weddings/member-invites.service.js';
import { ADMIN_ROLES, MEMBERSHIP_ROLES } from '../weddings/schemas/wedding-membership.schema.js';
import { WeddingAccessService, type WeddingAccess } from '../weddings/wedding-access.service.js';
import {
  memberNotFound,
  notYourself,
  ownerProtected,
  weddingArchived,
} from '../weddings/wedding-errors.js';

/**
 * The team page (PRD TEAM-01 to TEAM-05, decision 0020): who is on the
 * wedding, changing an admin's or manager's role or anyone's label, and
 * removing an admin or manager. Owners and admins only; managers never
 * manage the team. The bride and groom (owners) are never removed or
 * changed here, and nobody removes themselves or changes their own role.
 * Removing someone takes effect at their next request (every wedding route
 * checks membership), leaves their tasks unassigned, and keeps everything
 * they wrote. Every change is in the audit log.
 */
@Traced()
@Injectable()
export class TeamService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly access: WeddingAccessService,
    private readonly invites: MemberInvitesService,
    private readonly accounts: AccountsService,
    private readonly tasks: TasksService,
    private readonly audit: AuditService,
  ) {}

  async view(user: AuthenticatedUser, weddingId: string): Promise<TeamDto> {
    const access = await this.access.require(user, weddingId, ADMIN_ROLES);
    const [members, invites] = await Promise.all([
      this.members(access),
      this.invites.invitesOf(access.wedding._id),
    ]);
    return { members, invites, viewerRole: access.role };
  }

  async update(
    user: AuthenticatedUser,
    weddingId: string,
    memberId: string,
    input: UpdateMemberDto,
  ): Promise<TeamMemberDto> {
    const access = await this.access.require(user, weddingId, ADMIN_ROLES);
    const { wedding, userId } = access;
    if (wedding.status !== 'active') throw weddingArchived();
    const target = await this.target(access, memberId);
    if (input.role !== undefined) {
      if (target.equals(userId)) throw notYourself();
      const current = await this.roleOf(access, target);
      if (current === 'owner') throw ownerProtected();
    }
    const label = input.label === undefined ? undefined : input.label || null;

    if (input.role !== undefined || label !== undefined) {
      await this.connection.transaction(async (session) => {
        await this.access.raiseWriteFence(wedding._id, session);
        const changed = await this.access.updateMembership(
          wedding._id,
          target,
          {
            ...(input.role ? { role: input.role } : {}),
            ...(label !== undefined ? { label } : {}),
          },
          session,
        );
        // Removed, or made an owner, since the checks above.
        if (!changed) throw memberNotFound();
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'member.updated',
          entityType: 'membership',
          entityId: target,
          safeDiff: {
            ...(input.role ? { role: input.role } : {}),
            ...(label !== undefined ? { labelChanged: true } : {}),
          },
        });
      });
    }
    const updated = (await this.members(access)).find((member) => member.userId === memberId);
    if (!updated) throw memberNotFound();
    return updated;
  }

  async remove(user: AuthenticatedUser, weddingId: string, memberId: string): Promise<void> {
    const access = await this.access.require(user, weddingId, ADMIN_ROLES);
    const { wedding, userId } = access;
    if (wedding.status !== 'active') throw weddingArchived();
    const target = await this.target(access, memberId);
    if (target.equals(userId)) throw notYourself();
    const role = await this.roleOf(access, target);
    if (role === 'owner') throw ownerProtected();

    await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      // The write itself refuses an owner, whatever was read above.
      const removed = await this.access.removeMembership(wedding._id, target, userId, session);
      if (!removed) throw memberNotFound();
      const unassigned = await this.tasks.unassignMember(wedding._id, target, session);
      await this.audit.record(session, {
        weddingId: wedding._id,
        actorUserId: userId,
        action: 'member.removed',
        entityType: 'membership',
        entityId: target,
        safeDiff: { role: role ?? null, unassignedTasks: unassigned },
      });
    });
  }

  /** The member a route names, as an ID; 404 unless they are on this team. */
  private async target(access: WeddingAccess, memberId: string): Promise<Types.ObjectId> {
    const id = parseObjectId(memberId);
    if (!id || (await this.roleOf(access, id)) === undefined) throw memberNotFound();
    return id;
  }

  private async roleOf(access: WeddingAccess, userId: Types.ObjectId) {
    const members = await this.access.activeMembers(access.wedding._id);
    return members.find((member) => member.userId.equals(userId))?.role;
  }

  /** Owners first, then admins, then managers, each by name. */
  private async members(access: WeddingAccess): Promise<TeamMemberDto[]> {
    const weddingId = access.wedding._id;
    const members = await this.access.activeMembers(weddingId);
    const [contacts, counts] = await Promise.all([
      this.accounts.contacts(members.map((member) => member.userId)),
      this.tasks.openCounts(weddingId),
    ]);
    return members
      .flatMap((member): TeamMemberDto[] => {
        const id = member.userId.toHexString();
        const contact = contacts.get(id);
        if (!contact) return [];
        return [
          {
            userId: id,
            displayName: contact.displayName,
            email: contact.email,
            role: member.role,
            ...(member.label ? { label: member.label } : {}),
            joinedAt: member.joinedAt,
            openTaskCount: counts.get(id) ?? 0,
            isYou: member.userId.equals(access.userId),
          },
        ];
      })
      .sort(
        (a, b) =>
          MEMBERSHIP_ROLES.indexOf(a.role) - MEMBERSHIP_ROLES.indexOf(b.role) ||
          a.displayName.localeCompare(b.displayName, 'en-IN'),
      );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingMembership, type MembershipRole } from './schemas/wedding-membership.schema.js';
import { Wedding } from './schemas/wedding.schema.js';
import { ownersOnly, weddingNotFound } from './wedding-errors.js';
import { Traced } from '../../platform/tracing.js';

export interface WeddingAccess {
  wedding: Wedding & { _id: Types.ObjectId };
  role: MembershipRole;
  userId: Types.ObjectId;
}

/**
 * The one check behind every route under /weddings/{weddingId}: the user
 * must be an active member of that wedding (architecture: "all Mongo queries
 * must be wedding-scoped"). Anyone else gets 404, the same as for a wedding
 * that does not exist, so an ID reveals nothing. A member without the role
 * the action needs gets 403.
 */
@Traced()
@Injectable()
export class WeddingAccessService {
  constructor(
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    @InjectModel(WeddingMembership.name) private readonly memberships: Model<WeddingMembership>,
  ) {}

  async require(
    user: AuthenticatedUser,
    weddingId: string,
    roles: readonly MembershipRole[] = ['owner', 'manager'],
  ): Promise<WeddingAccess> {
    const id = parseObjectId(weddingId);
    if (!id) throw weddingNotFound();
    const userId = new Types.ObjectId(user.id);
    // Independent reads, so in parallel: this runs on every wedding route.
    // The wedding is read even for a non-member, but never returned to one.
    const [membership, wedding] = await Promise.all([
      this.memberships.findOne({ weddingId: id, userId, status: 'active' }, { role: 1 }).lean(),
      this.weddings.findById(id).lean(),
    ]);
    if (!membership || !wedding) throw weddingNotFound();
    if (!roles.includes(membership.role)) throw ownersOnly();
    return { wedding, role: membership.role, userId };
  }
}

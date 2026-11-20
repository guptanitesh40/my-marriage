import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema.js';
import { Traced } from '../../platform/tracing.js';

/**
 * What other modules may know about an account (architecture rule 5: they
 * never read the users collection themselves). Only display details: never
 * the password hash or account state.
 */
@Traced()
@Injectable()
export class AccountsService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  /** The name an account shows to the people it plans with, if it exists. */
  async displayName(userId: Types.ObjectId): Promise<string | undefined> {
    const user = await this.users.findById(userId, { displayName: 1 }).lean();
    return user?.displayName;
  }

  /** The names of several accounts, by ID; accounts that do not exist are left out. */
  async displayNames(userIds: readonly Types.ObjectId[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const users = await this.users.find({ _id: { $in: userIds } }, { displayName: 1 }).lean();
    return new Map(users.map((user) => [user._id.toHexString(), user.displayName]));
  }
}

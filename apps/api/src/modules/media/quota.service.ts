import { Injectable } from '@nestjs/common';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import type { QuotaDto } from './dto/quota.dto.js';

/** The wedding's photo storage, as its owners and managers see it (PRD PHOTO-05). */
@Traced()
@Injectable()
export class QuotaService {
  constructor(private readonly access: WeddingAccessService) {}

  async get(user: AuthenticatedUser, weddingId: string): Promise<QuotaDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const { limitBytes, usedBytes, reservedBytes } = wedding.quota;
    return { limitBytes, usedBytes, reservedBytes };
  }
}

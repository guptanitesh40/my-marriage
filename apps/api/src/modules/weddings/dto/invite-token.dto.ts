import { LinkTokenField } from '../../auth/dto/fields.js';

/** The secret from an invitation link (`/invitations/accept#token=…`). */
export class InviteTokenDto {
  @LinkTokenField()
  token: string;
}

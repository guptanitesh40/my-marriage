import { EmailField } from './fields.js';

export class ResendVerificationDto {
  /** The address to send a new verification link to, if it has an unverified account. */
  @EmailField()
  email: string;
}

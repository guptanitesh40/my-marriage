import { EmailField } from './fields.js';

export class ForgotPasswordDto {
  /** Where to send the reset link, if the address has an account. */
  @EmailField()
  email: string;
}

import { LinkTokenField, NewPasswordField } from './fields.js';

export class ResetPasswordDto {
  /** The secret from the reset link (the part after `#token=`). */
  @LinkTokenField()
  token: string;

  /** The new password: at least 10 characters, not easily guessed. */
  @NewPasswordField()
  password: string;
}

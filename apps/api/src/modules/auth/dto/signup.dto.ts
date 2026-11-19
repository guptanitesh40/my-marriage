import { DisplayNameField, EmailField, NewPasswordField } from './fields.js';

export class SignupDto {
  /** Sign-in address. A verification email is sent here. */
  @EmailField()
  email: string;

  /** At least 10 characters. Common and easily guessed passwords are refused. */
  @NewPasswordField()
  password: string;

  /** The name your partner and family see. */
  @DisplayNameField()
  displayName: string;
}

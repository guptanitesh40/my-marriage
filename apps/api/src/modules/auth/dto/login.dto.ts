import { CurrentPasswordField, EmailField } from './fields.js';

export class LoginDto {
  @EmailField()
  email: string;

  @CurrentPasswordField()
  password: string;
}

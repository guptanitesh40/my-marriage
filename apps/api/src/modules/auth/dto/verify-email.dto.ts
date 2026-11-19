import { LinkTokenField } from './fields.js';

export class VerifyEmailDto {
  /** The secret from the verification link (the part after `#token=`). */
  @LinkTokenField()
  token: string;
}

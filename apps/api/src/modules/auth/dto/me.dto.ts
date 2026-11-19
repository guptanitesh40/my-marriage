/** The signed-in account. */
export class MeDto {
  /** Account ID. */
  id: string;

  /** Sign-in email address. */
  email: string;

  displayName: string;

  /** False until the link in the verification email is used; most features wait for it. */
  emailVerified: boolean;
}

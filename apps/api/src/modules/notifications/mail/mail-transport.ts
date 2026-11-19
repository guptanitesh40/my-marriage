export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Same key for every retry of one logical email. */
  idempotencyKey: string;
}

export interface SentEmail {
  /** The provider's ID, when it gave one. */
  providerMessageId?: string;
}

/**
 * How an email leaves the worker (MAIL_TRANSPORT). An abstract class so it
 * doubles as the injection token.
 *
 * Errors: throw `PermanentMailError` when retrying cannot help, anything else
 * to be retried. Never put an address, token or provider message in an error.
 */
export abstract class MailTransport {
  abstract send(email: OutgoingEmail): Promise<SentEmail>;
}

/** Retrying will not help (rejected address, bad credentials). `code` is safe to store. */
export class PermanentMailError extends Error {
  constructor(readonly code: string) {
    super(`Email rejected permanently (${code})`);
    this.name = 'PermanentMailError';
  }
}

/** Worth retrying later (provider down, rate limited, network). `code` is safe to store. */
export class TransientMailError extends Error {
  constructor(readonly code: string) {
    super(`Email not sent yet (${code})`);
    this.name = 'TransientMailError';
  }
}

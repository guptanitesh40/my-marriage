import {
  MailTransport,
  PermanentMailError,
  TransientMailError,
  type OutgoingEmail,
  type SentEmail,
} from './mail-transport.js';
import { Traced } from '../../../platform/tracing.js';

const ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

interface ResendError {
  name?: unknown;
}

/** `validation_error` → `RESEND_VALIDATION_ERROR`; anything odd → `RESEND_UNKNOWN`. */
function errorCode(body: unknown): string {
  const name = (body as ResendError | null)?.name;
  return typeof name === 'string' && /^[a-z_]{1,60}$/.test(name)
    ? `RESEND_${name.toUpperCase()}`
    : 'RESEND_UNKNOWN';
}

/**
 * Sends through Resend's REST API (https://resend.com/docs/api-reference).
 * Plain `fetch`, so there is no SDK to keep up to date; decision 0003.
 *
 * Resend remembers an idempotency key for 24 hours: a retry with the same key
 * returns the original result instead of sending again.
 */
@Traced()
export class ResendTransport extends MailTransport {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super();
  }

  async send(email: OutgoingEmail): Promise<SentEmail> {
    let response: Response;
    try {
      response = await this.fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': email.idempotencyKey,
          'User-Agent': 'my-marriage-api',
        },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Timeout or network failure: the email may or may not have been
      // accepted. Retrying with the same key is safe either way.
      throw new TransientMailError('RESEND_UNREACHABLE');
    }

    const body: unknown = await response.json().catch(() => null);
    if (response.ok) {
      const id = (body as { id?: unknown } | null)?.id;
      return typeof id === 'string' ? { providerMessageId: id } : {};
    }

    const code = errorCode(body);
    if (response.status === 409 && code === 'RESEND_INVALID_IDEMPOTENT_REQUEST') {
      // This key was already used, by an earlier attempt that Resend accepted
      // but whose reply we never received. The email went out; a retry builds
      // a new link, which is why the payload differs.
      return {};
    }
    if (response.status === 409 || response.status === 429 || response.status >= 500) {
      throw new TransientMailError(code);
    }
    throw new PermanentMailError(code);
  }
}

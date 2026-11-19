import { createTransport } from 'nodemailer';
import { Traced } from '../../../platform/tracing.js';
import {
  MailTransport,
  PermanentMailError,
  TransientMailError,
  type OutgoingEmail,
  type SentEmail,
} from './mail-transport.js';

export interface SmtpSettings {
  host: string;
  /** 465: TLS from the start; anything else (587): STARTTLS, required. */
  port: number;
  user: string;
  /** For Gmail, an App Password, never the account's own password. */
  password: string;
}

/** The part of a Nodemailer transporter this transport uses; replaced in tests. */
export interface SmtpMailer {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    messageId: string;
  }): Promise<{ messageId?: unknown }>;
}

const TIMEOUT_MS = 15_000;

/** Nodemailer codes for "the server could not be reached or the connection dropped". */
const NETWORK_CODES = new Set([
  'ECONNECTION',
  'ETIMEDOUT',
  'ESOCKET',
  'EDNS',
  'ETLS',
  'EPROTOCOL',
  'EPROXY',
]);

interface SmtpError {
  code?: unknown;
  responseCode?: unknown;
  response?: unknown;
}

/**
 * Turns a Nodemailer failure into a code that is safe to store: never the
 * server's message, which can quote the recipient's address.
 */
function classify(error: unknown): PermanentMailError | TransientMailError {
  const { code, responseCode, response } = (error ?? {}) as SmtpError;
  if (code === 'EAUTH' || code === 'ENOAUTH') {
    // A wrong user or App Password: retrying cannot help.
    return new PermanentMailError('SMTP_AUTH_FAILED');
  }
  if (typeof responseCode === 'number') {
    // Gmail's daily sending limit (550 5.4.5) lifts after a day, far beyond
    // the retries; the owner can resend then.
    if (typeof response === 'string' && /\b5\.4\.5\b/.test(response)) {
      return new PermanentMailError('SMTP_DAILY_LIMIT');
    }
    if (responseCode >= 400 && responseCode < 500) {
      return new TransientMailError(`SMTP_${responseCode}`);
    }
    if (responseCode >= 500 && responseCode < 600) {
      return new PermanentMailError(`SMTP_${responseCode}`);
    }
  }
  if (code === 'EENVELOPE') return new PermanentMailError('SMTP_RECIPIENT_REJECTED');
  if (typeof code === 'string' && NETWORK_CODES.has(code)) {
    return new TransientMailError('SMTP_UNREACHABLE');
  }
  return new TransientMailError('SMTP_UNKNOWN');
}

/** `verify_email:6740…` → `<verify_email.6740…@my-marriage>`: one Message-ID per email. */
function messageIdFor(idempotencyKey: string): string {
  return `<${idempotencyKey.replace(/[^A-Za-z0-9._-]/g, '.')}@my-marriage>`;
}

/**
 * Sends over SMTP with Nodemailer: Gmail (smtp.gmail.com) in every
 * environment that sends real email; decision 0007.
 *
 * SMTP has no idempotency key. Every attempt for one email carries the same
 * Message-ID, so if a retry follows a send whose reply was lost, Gmail
 * usually files the second copy as a duplicate; this is not guaranteed.
 */
@Traced()
export class SmtpTransport extends MailTransport {
  private readonly mailer: SmtpMailer;

  constructor(settings: SmtpSettings, mailer?: SmtpMailer) {
    super();
    this.mailer =
      mailer ??
      createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        // On 587 the connection must upgrade to TLS before the password is sent.
        requireTLS: settings.port !== 465,
        auth: { user: settings.user, pass: settings.password },
        connectionTimeout: TIMEOUT_MS,
        greetingTimeout: TIMEOUT_MS,
        socketTimeout: TIMEOUT_MS,
      });
  }

  async send(email: OutgoingEmail): Promise<SentEmail> {
    try {
      const info = await this.mailer.sendMail({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        messageId: messageIdFor(email.idempotencyKey),
      });
      return typeof info.messageId === 'string' ? { providerMessageId: info.messageId } : {};
    } catch (error) {
      throw classify(error);
    }
  }
}

import { describe, expect, it, vi } from 'vitest';
import { PermanentMailError, TransientMailError, type OutgoingEmail } from './mail-transport.js';
import { SmtpTransport, type SmtpMailer } from './smtp.transport.js';

const email: OutgoingEmail = {
  from: 'My Marriage <hello@gmail.com>',
  to: 'priya@example.com',
  subject: 'Verify your email',
  html: '<p>Hello</p>',
  text: 'Hello',
  idempotencyKey: 'verify_email:6740a1b2c3d4e5f601234567',
};

const settings = { host: 'smtp.gmail.com', port: 465, user: 'hello@gmail.com', password: 'app' };

function transportWith(sendMail: SmtpMailer['sendMail']) {
  const mailer = { sendMail: vi.fn(sendMail) };
  return { transport: new SmtpTransport(settings, mailer), mailer };
}

/** An error shaped like the ones Nodemailer rejects with. */
function smtpError(fields: { code?: string; responseCode?: number; response?: string }) {
  return Object.assign(new Error('Message failed: 550 priya@example.com unknown'), fields);
}

async function failure(fields: Parameters<typeof smtpError>[0]) {
  const { transport } = transportWith(() => Promise.reject(smtpError(fields)));
  return transport.send(email).catch((caught: unknown) => caught);
}

describe('SmtpTransport', () => {
  it('sends one email, with a Message-ID that is the same on every retry', async () => {
    const { transport, mailer } = transportWith(() =>
      Promise.resolve({ messageId: '<verify_email.6740a1b2c3d4e5f601234567@my-marriage>' }),
    );

    await expect(transport.send(email)).resolves.toEqual({
      providerMessageId: '<verify_email.6740a1b2c3d4e5f601234567@my-marriage>',
    });
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: email.from,
      to: 'priya@example.com',
      subject: email.subject,
      html: email.html,
      text: email.text,
      messageId: '<verify_email.6740a1b2c3d4e5f601234567@my-marriage>',
    });
  });

  it.each([
    [{ code: 'EAUTH', responseCode: 535 }, 'SMTP_AUTH_FAILED'],
    [{ code: 'EENVELOPE', responseCode: 553 }, 'SMTP_553'],
    [{ code: 'EENVELOPE' }, 'SMTP_RECIPIENT_REJECTED'],
    [
      {
        code: 'EMESSAGE',
        responseCode: 550,
        response: '550 5.4.5 Daily user sending limit exceeded',
      },
      'SMTP_DAILY_LIMIT',
    ],
  ])('gives up on %j as %s', async (fields, code) => {
    const error = await failure(fields);
    expect(error).toBeInstanceOf(PermanentMailError);
    expect((error as PermanentMailError).code).toBe(code);
    // The server's message can contain the address; it must not travel on.
    expect((error as Error).message).not.toContain('priya@example.com');
  });

  it.each([
    [{ code: 'EMESSAGE', responseCode: 421 }, 'SMTP_421'],
    [{ code: 'EENVELOPE', responseCode: 451 }, 'SMTP_451'],
    [{ code: 'ETIMEDOUT' }, 'SMTP_UNREACHABLE'],
    [{ code: 'ECONNECTION' }, 'SMTP_UNREACHABLE'],
    [{}, 'SMTP_UNKNOWN'],
  ])('retries later after %j as %s', async (fields, code) => {
    const error = await failure(fields);
    expect(error).toBeInstanceOf(TransientMailError);
    expect((error as TransientMailError).code).toBe(code);
  });
});

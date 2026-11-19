import { describe, expect, it, vi } from 'vitest';
import { PermanentMailError, TransientMailError, type OutgoingEmail } from './mail-transport.js';
import { ResendTransport } from './resend.transport.js';

const email: OutgoingEmail = {
  from: 'My Marriage <hello@example.com>',
  to: 'priya@example.com',
  subject: 'Verify your email',
  html: '<p>Hello</p>',
  text: 'Hello',
  idempotencyKey: 'verify_email:6740a1b2c3d4e5f601234567',
};

function transportReplying(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
  return { transport: new ResendTransport('re_test_key', fetchMock), fetchMock };
}

describe('ResendTransport', () => {
  it('sends one recipient with the API key and the idempotency key', async () => {
    const { transport, fetchMock } = transportReplying(200, { id: 'msg_123' });

    await expect(transport.send(email)).resolves.toEqual({ providerMessageId: 'msg_123' });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe('Bearer re_test_key');
    expect(headers.get('idempotency-key')).toBe(email.idempotencyKey);
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toEqual({
      from: email.from,
      to: ['priya@example.com'],
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  });

  it.each([
    [429, 'rate_limit_exceeded', 'RESEND_RATE_LIMIT_EXCEEDED'],
    [500, 'internal_server_error', 'RESEND_INTERNAL_SERVER_ERROR'],
    [503, undefined, 'RESEND_UNKNOWN'],
    [409, 'concurrent_idempotent_requests', 'RESEND_CONCURRENT_IDEMPOTENT_REQUESTS'],
  ])('retries later after HTTP %i (%s)', async (status, name, code) => {
    const { transport } = transportReplying(status, { name, message: 'details' });
    const error = await transport.send(email).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TransientMailError);
    expect((error as TransientMailError).code).toBe(code);
  });

  it.each([
    [422, 'validation_error', 'RESEND_VALIDATION_ERROR'],
    [403, 'invalid_api_key', 'RESEND_INVALID_API_KEY'],
  ])('gives up after HTTP %i (%s)', async (status, name, code) => {
    const { transport } = transportReplying(status, { name, message: 'priya@example.com is bad' });
    const error = await transport.send(email).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PermanentMailError);
    expect((error as PermanentMailError).code).toBe(code);
    // The provider's message can contain the address; it must not travel on.
    expect((error as Error).message).not.toContain('priya@example.com');
  });

  it('treats a reused idempotency key as already sent', async () => {
    const { transport } = transportReplying(409, { name: 'invalid_idempotent_request' });
    await expect(transport.send(email)).resolves.toEqual({});
  });

  it('retries when Resend cannot be reached', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('fetch failed')));
    const error = await new ResendTransport('re_test_key', fetchMock)
      .send(email)
      .catch((caught: unknown) => caught);
    expect(error).toEqual(new TransientMailError('RESEND_UNREACHABLE'));
  });
});

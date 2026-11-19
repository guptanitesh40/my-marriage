import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerInvite } from './partner-invite';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, GET: vi.fn() } }));

function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

const invite = {
  id: 'i1',
  email: 'arjun@example.com',
  role: 'owner' as const,
  status: 'pending' as const,
  emailStatus: 'sending' as const,
  expiresAt: '2099-01-08T10:00:00.000Z',
  createdAt: '2099-01-01T10:00:00.000Z',
};

async function click(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

beforeEach(() => post.mockReset());
afterEach(cleanup);

describe('PartnerInvite', () => {
  it('checks the address before sending, then shows the invitation on its way', async () => {
    render(<PartnerInvite weddingId="w1" created={{ couple: 'A & B', details: 'Jaipur' }} />);
    expect(screen.getByRole('status').textContent).toContain('A & B’s wedding is created.');

    fireEvent.change(screen.getByLabelText('Partner’s email address'), {
      target: { value: 'not an email' },
    });
    await click(/send invitation/i);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a valid email address/)).toBeTruthy();

    post.mockResolvedValue(reply(201, { data: invite }));
    fireEvent.change(screen.getByLabelText('Partner’s email address'), {
      target: { value: ' arjun@example.com ' },
    });
    await click(/send invitation/i);
    expect(post).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/member-invites', {
      params: { path: { weddingId: 'w1' } },
      body: { email: 'arjun@example.com', role: 'owner' },
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Invitation on its way');
    expect(screen.getByText('Invitation sent to arjun@example.com')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('shows the API’s reason beside the field', async () => {
    post.mockResolvedValue(
      reply(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'x',
          details: [{ field: 'email', messages: ['This is your own address.'] }],
        },
        requestId: 'r',
      }),
    );
    render(<PartnerInvite weddingId="w1" />);
    fireEvent.change(screen.getByLabelText('Partner’s email address'), {
      target: { value: 'me@example.com' },
    });
    await click(/send invitation/i);
    expect(screen.getByText('This is your own address.')).toBeTruthy();
    expect(screen.getByLabelText('Partner’s email address').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('resends with a new link, and says when to wait', async () => {
    render(<PartnerInvite weddingId="w1" initial={invite} />);
    post.mockResolvedValueOnce(reply(200, { data: { ...invite, emailStatus: 'sending' } }));
    await click(/resend invitation/i);
    expect(post).toHaveBeenCalledWith(
      '/api/v1/weddings/{weddingId}/member-invites/{inviteId}/resend',
      { params: { path: { weddingId: 'w1', inviteId: 'i1' } } },
    );
    expect(screen.getByRole('status').textContent).toContain('Earlier links no longer work');

    post.mockResolvedValueOnce(
      reply(429, {
        error: { code: 'RATE_LIMITED', message: 'x', details: { retryAfterSeconds: 40 } },
        requestId: 'r',
      }),
    );
    await click(/resend invitation/i);
    expect(screen.getByRole('alert').textContent).toContain('wait a minute');
  });

  it('says when the email could not be sent, or the link expired', () => {
    render(<PartnerInvite weddingId="w1" initial={{ ...invite, emailStatus: 'failed' }} />);
    expect(screen.getByRole('alert').textContent).toContain('could not be sent');
    cleanup();
    render(<PartnerInvite weddingId="w1" initial={{ ...invite, status: 'expired' }} />);
    expect(screen.getByRole('alert').textContent).toContain('has expired');
  });

  it('goes back to the form to invite another address', async () => {
    render(<PartnerInvite weddingId="w1" initial={invite} />);
    await click(/edit invitation/i);
    const field = screen.getByLabelText<HTMLInputElement>('Partner’s email address');
    expect(field.value).toBe('arjun@example.com');
    // Right after creating, the "created" note is not shown again here.
    expect(screen.queryByRole('status')).toBeNull();
  });
});

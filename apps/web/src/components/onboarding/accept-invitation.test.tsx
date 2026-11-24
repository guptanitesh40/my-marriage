import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptInvitation, INVITE_TOKEN_KEY } from './accept-invitation';

const post = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, GET: get } }));

function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

const token = 'Xk29abcdefghijklmnopqrstuvwxyz0123456789_-A';
const preview = {
  brideName: 'Pushpa',
  groomName: 'Nitesh',
  city: 'Ara',
  state: 'Bihar',
  invitedByName: 'Pushpa Devi',
  email: 'nitesh@example.com',
  role: 'owner',
  handOver: false,
  status: 'pending',
  expiresAt: '2099-01-08T10:00:00.000Z',
};
const me = {
  id: 'u2',
  email: 'nitesh@example.com',
  displayName: 'Nitesh',
  emailVerified: true,
};

/** Answers by path, like the API would. */
function answer(responses: { preview?: unknown; me?: unknown; accept?: unknown }) {
  post.mockImplementation((path: string) =>
    Promise.resolve(path.endsWith('/preview') ? responses.preview : responses.accept),
  );
  get.mockResolvedValue(responses.me ?? reply(401, { error: { code: 'UNAUTHENTICATED' } }));
}

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  sessionStorage.clear();
  window.history.replaceState(null, '', `/invitations/accept#token=${token}`);
});

afterEach(cleanup);

describe('AcceptInvitation', () => {
  it('asks a signed-out invitee to sign in with the invited address, keeping the link', async () => {
    answer({ preview: reply(200, { data: preview }) });
    render(<AcceptInvitation />);

    expect(await screen.findByRole('heading', { name: 'You’re invited' })).toBeTruthy();
    expect(
      screen.getByText(/Pushpa Devi invited you to plan Pushpa & Nitesh’s wedding/),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in to accept' }).getAttribute('href')).toBe(
      '/login?next=%2Finvitations%2Faccept',
    );
    // The secret leaves the address bar, but this tab keeps it for after signing in.
    expect(window.location.hash).toBe('');
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBe(token);
    expect(post).toHaveBeenCalledWith('/api/v1/member-invites/preview', { body: { token } });
  });

  it('accepts for the invited, verified account, from the kept link after signing in', async () => {
    window.history.replaceState(null, '', '/invitations/accept');
    sessionStorage.setItem(INVITE_TOKEN_KEY, token);
    answer({
      preview: reply(200, { data: preview }),
      me: reply(200, { data: me }),
      accept: reply(200, {
        data: { id: 'w1', brideName: 'Pushpa', groomName: 'Nitesh', role: 'owner' },
      }),
    });
    render(<AcceptInvitation />);

    const button = await screen.findByRole('button', { name: 'Accept invitation' });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(post).toHaveBeenCalledWith('/api/v1/member-invites/accept', { body: { token } });
    expect(await screen.findByRole('heading', { name: 'Welcome to the wedding' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open the wedding workspace' }).getAttribute('href'),
    ).toBe('/weddings/w1');
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
  });

  it('shows a manager what they can do, and lets them decline', async () => {
    answer({
      preview: reply(200, { data: { ...preview, role: 'manager' } }),
      me: reply(200, { data: me }),
      accept: reply(204),
    });
    render(<AcceptInvitation />);

    expect(
      await screen.findByRole('heading', { name: 'Help plan Pushpa & Nitesh’s wedding' }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Pushpa Devi invited you to join their planning team as a manager/),
    ).toBeTruthy();
    expect(screen.getByText('What you can do')).toBeTruthy();
    expect(screen.getByText(/Any wedding of your own stays as it is/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Accept invitation & open workspace' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
      await Promise.resolve();
    });
    expect(post).toHaveBeenCalledWith('/api/v1/member-invites/decline', { body: { token } });
    expect(await screen.findByRole('heading', { name: 'Invitation declined' })).toBeTruthy();
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
  });

  it('says what a hand-over changes, and why one can no longer be accepted', async () => {
    answer({
      preview: reply(200, { data: { ...preview, handOver: true } }),
      me: reply(200, { data: me }),
      accept: reply(410, {
        error: {
          code: 'HAND_OVER_INVALID',
          message: 'The person who sent this is no longer an owner of the wedding.',
        },
      }),
    });
    render(<AcceptInvitation />);

    expect(await screen.findByRole('heading', { name: 'Take over as an owner' })).toBeTruthy();
    expect(
      screen.getByText(/Pushpa Devi invited you to take over their place as an owner/),
    ).toBeTruthy();
    expect(screen.getByText('What changes when you accept')).toBeTruthy();
    expect(screen.getByText(/Pushpa Devi stays on the team as an admin/)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Accept and become an owner' }));
      await Promise.resolve();
    });
    expect((await screen.findByRole('alert')).textContent).toContain('no longer an owner');
  });

  it('explains when another account is signed in', async () => {
    answer({
      preview: reply(200, { data: preview }),
      me: reply(200, { data: { ...me, email: 'someone@example.com' } }),
    });
    render(<AcceptInvitation />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'This invitation is for nitesh@example.com, but you’re signed in as someone@example.com.',
    );
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull();
  });

  it('asks an unverified invitee to verify first', async () => {
    answer({
      preview: reply(200, { data: preview }),
      me: reply(200, { data: { ...me, emailVerified: false } }),
    });
    render(<AcceptInvitation />);
    expect(await screen.findByRole('link', { name: 'Verify your email' })).toBeTruthy();
  });

  it('shows the reason when accepting is refused', async () => {
    answer({
      preview: reply(200, { data: preview }),
      me: reply(200, { data: me }),
      accept: reply(409, {
        error: { code: 'OWNER_ACTIVE_LIMIT', message: 'You already own an active wedding.' },
        requestId: 'r',
      }),
    });
    render(<AcceptInvitation />);
    const button = await screen.findByRole('button', { name: 'Accept invitation' });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect((await screen.findByRole('alert')).textContent).toContain(
      'You already own an active wedding.',
    );
  });

  it('says when the link no longer works, and forgets it', async () => {
    answer({
      preview: reply(410, { error: { code: 'INVITE_INVALID', message: 'x' }, requestId: 'r' }),
    });
    render(<AcceptInvitation />);
    expect(
      await screen.findByRole('heading', { name: 'This invitation cannot be used' }),
    ).toBeTruthy();
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
  });

  it('asks for the emailed link when opened without one', async () => {
    window.history.replaceState(null, '', '/invitations/accept');
    render(<AcceptInvitation />);
    expect(await screen.findByRole('heading', { name: 'Open your invitation link' })).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});

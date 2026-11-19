import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingInvitations } from './pending-invitations';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, GET: vi.fn() } }));

const goTo = vi.hoisted(() => vi.fn());
vi.mock('@/components/auth/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/auth/hooks')>()),
  goTo,
}));

/** What openapi-fetch resolves to. */
function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

function failure(status: number, code: string, message = 'From the API.') {
  return reply(status, { error: { code, message }, requestId: 'req_test' });
}

const invite = {
  id: '6740a1b2c3d4e5f601234567',
  brideName: 'Ananya',
  groomName: 'Arjun',
  city: 'Jaipur',
  state: 'Rajasthan',
  weddingDate: '2027-02-14',
  invitedByName: 'Arjun Mehta',
  role: 'owner' as const,
  expiresAt: '2099-01-08T10:00:00.000Z',
};
const other = {
  ...invite,
  id: '6740a1b2c3d4e5f601234568',
  brideName: 'Riya',
  groomName: 'Kabir',
  city: 'Udaipur',
  weddingDate: undefined,
  invitedByName: 'Kabir Sharma',
};
const email = 'priya@example.com';

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

beforeEach(() => {
  post.mockReset();
  goTo.mockReset();
});

afterEach(cleanup);

async function click(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

describe('PendingInvitations', () => {
  it('shows the invitation and joins with one click, without the link', async () => {
    post.mockResolvedValue(reply(200, { data: { id: 'w1' } }));
    render(<PendingInvitations invites={[invite]} email={email} />);

    expect(screen.getByRole('heading', { name: 'Join your wedding.' })).toBeTruthy();
    expect(
      screen.getByText(
        'Arjun Mehta has already set up your wedding on My Marriage and invited you to plan it together.',
      ),
    ).toBeTruthy();
    const card = screen.getByRole('region', { name: 'Invitation to Ananya & Arjun’s wedding' });
    expect(within(card).getByRole('heading', { name: 'Ananya & Arjun' })).toBeTruthy();
    expect(within(card).getByText('Jaipur, Rajasthan')).toBeTruthy();
    expect(within(card).getByText('Sunday, 14 February 2027')).toBeTruthy();
    expect(within(card).getByText('AM')).toBeTruthy();
    expect(card.textContent).toContain(
      'You’ll join as an equal owner, with the same access as Arjun. You can plan everything together.',
    );
    expect(card.textContent).toContain('Only you can accept one sent to priya@example.com.');

    await click('Accept and join');
    expect(post).toHaveBeenCalledWith('/api/v1/member-invites/{inviteId}/accept', {
      params: { path: { inviteId: invite.id } },
    });
    expect(goTo).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the button as busy while joining', async () => {
    let finish: (value: unknown) => void = () => undefined;
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<PendingInvitations invites={[invite]} email={email} />);

    await click('Accept and join');
    const busy = screen.getByRole('button', { name: 'Joining…' });
    expect(busy.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Start my own wedding instead' })).toBeNull();
    await act(async () => finish(reply(200, { data: { id: 'w1' } })));
  });

  it.each([
    [
      failure(410, 'INVITE_INVALID'),
      'This invitation is no longer valid. Ask Arjun to send a new one.',
    ],
    [
      failure(404, 'INVITE_NOT_FOUND'),
      'This invitation is no longer valid. Ask Arjun to send a new one.',
    ],
    [failure(409, 'OWNER_LIMIT'), 'Ananya & Arjun’s wedding already has two owners.'],
  ])('explains a refusal and offers to start a wedding instead', async (answer, message) => {
    post.mockResolvedValue(answer);
    render(<PendingInvitations invites={[invite]} email={email} />);

    await click('Accept and join');
    expect(screen.getByRole('alert').textContent).toContain(message);
    expect(screen.queryByRole('button', { name: /Accept and join/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Start my own wedding instead' })).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it('offers to try again after a network failure', async () => {
    post.mockRejectedValueOnce(new TypeError('fetch failed'));
    post.mockResolvedValueOnce(reply(200, { data: { id: 'w1' } }));
    render(<PendingInvitations invites={[invite]} email={email} />);

    await click('Accept and join');
    expect(screen.getByRole('alert')).toBeTruthy();
    await click('Try again');
    expect(goTo).toHaveBeenCalledWith('/dashboard');
  });

  it('asks before starting a separate wedding', async () => {
    render(<PendingInvitations invites={[invite]} email={email} />);

    await click('Start my own wedding instead');
    const dialog = screen.getByRole('dialog', { name: 'Start a separate wedding?' });
    expect(dialog.textContent).toContain(
      'If you start your own, you won’t be able to join Ananya & Arjun’s wedding.',
    );
    expect(within(dialog).getByRole('button', { name: 'Go back to invitation' })).toBeTruthy();
    expect(
      within(dialog).getByRole('link', { name: 'Start my own wedding' }).getAttribute('href'),
    ).toBe('/onboarding?start=own');
  });

  it('lists several invitations, each with its own button, one join at a time', async () => {
    let finish: (value: unknown) => void = () => undefined;
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<PendingInvitations invites={[invite, other]} email={email} />);

    expect(screen.getByRole('heading', { name: 'You have 2 invitations.' })).toBeTruthy();
    const riya = screen.getByRole('article', { name: 'Invitation to Riya & Kabir’s wedding' });
    expect(within(riya).getByText('Date not set yet')).toBeTruthy();
    expect(within(riya).getByText('Kabir Sharma')).toBeTruthy();

    await act(async () => {
      fireEvent.click(within(riya).getByRole('button', { name: /Accept and join this wedding/ }));
      await Promise.resolve();
    });
    expect(post).toHaveBeenCalledWith('/api/v1/member-invites/{inviteId}/accept', {
      params: { path: { inviteId: other.id } },
    });
    const ananya = screen.getByRole('article', { name: 'Invitation to Ananya & Arjun’s wedding' });
    expect(
      within(ananya)
        .getByRole('button', { name: /Accept and join this wedding/ })
        .hasAttribute('disabled'),
    ).toBe(true);
    await act(async () => finish(reply(200, { data: { id: 'w2' } })));
    expect(goTo).toHaveBeenCalledWith('/dashboard');
  });

  it('reads well without an inviter name or a date', () => {
    render(
      <PendingInvitations
        invites={[{ ...invite, invitedByName: undefined, weddingDate: undefined }]}
        email={email}
      />,
    );
    expect(
      screen.getByText(
        'Your wedding is already set up on My Marriage, and you’re invited to plan it together.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Date not set yet')).toBeTruthy();
    expect(screen.queryByText('Invited by')).toBeNull();
  });
});

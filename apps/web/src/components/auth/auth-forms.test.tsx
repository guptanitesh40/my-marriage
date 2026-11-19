import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordField } from '@/components/forms/password-field';
import { LoginForm } from './login-form';
import { ResetPasswordForm } from './reset-password-form';
import { SignupForm } from './signup-form';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, GET: vi.fn() } }));

const goTo = vi.hoisted(() => vi.fn());
vi.mock('./hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./hooks')>()),
  goTo,
}));

/** What openapi-fetch resolves to. */
function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return {
    data: ok ? body : undefined,
    error: ok ? undefined : body,
    response: { status, ok },
  };
}

function fill(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function submit(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  post.mockReset();
  goTo.mockReset();
  window.history.replaceState(null, '', '/');
});

afterEach(cleanup);

describe('LoginForm', () => {
  it('points out missing fields without calling the API, and focuses the first', async () => {
    render(<LoginForm />);
    await submit(/sign in/i);

    expect(post).not.toHaveBeenCalled();
    const email = screen.getByLabelText('Email address');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/valid email address/)).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(document.activeElement).toBe(email);
  });

  it('shows the API answer for wrong details as one alert', async () => {
    post.mockResolvedValue(
      reply(401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' },
        requestId: 'r',
      }),
    );
    render(<LoginForm />);
    fill('Email address', ' priya@example.com ');
    fill('Password', 'whatever it is');
    await submit(/sign in/i);

    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', {
      body: { email: 'priya@example.com', password: 'whatever it is' },
    });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Unable to sign in');
    expect(alert.textContent).toContain('Incorrect email or password.');
    expect(goTo).not.toHaveBeenCalled();
  });

  it('says how long to wait after too many attempts', async () => {
    post.mockResolvedValue(
      reply(429, {
        error: { code: 'RATE_LIMITED', message: 'x', details: { retryAfterSeconds: 600 } },
        requestId: 'r',
      }),
    );
    render(<LoginForm />);
    fill('Email address', 'priya@example.com');
    fill('Password', 'whatever it is');
    await submit(/sign in/i);
    expect((await screen.findByRole('alert')).textContent).toContain('wait 10 minutes');
  });

  it('goes back to a safe ?next= page after signing in, never to another site', async () => {
    const me = { id: '1', email: 'priya@example.com', displayName: 'Priya', emailVerified: true };
    post.mockResolvedValue(reply(200, { data: me, requestId: 'r' }));

    for (const [next, expected] of [
      ['/dashboard?tab=tasks', '/dashboard?tab=tasks'],
      ['//evil.example', '/dashboard'],
    ] as const) {
      goTo.mockReset();
      window.history.replaceState(null, '', `/login?next=${encodeURIComponent(next)}`);
      render(<LoginForm />);
      fill('Email address', 'priya@example.com');
      fill('Password', 'whatever it is');
      await submit(/sign in/i);
      await waitFor(() => expect(goTo).toHaveBeenCalledWith(expected));
      cleanup();
    }
  });

  it('sends an unverified account to the verification screen', async () => {
    const me = { id: '1', email: 'priya@example.com', displayName: 'Priya', emailVerified: false };
    post.mockResolvedValue(reply(200, { data: me, requestId: 'r' }));
    render(<LoginForm />);
    fill('Email address', 'priya@example.com');
    fill('Password', 'whatever it is');
    await submit(/sign in/i);
    await waitFor(() => expect(goTo).toHaveBeenCalledWith('/verify-email'));
  });
});

describe('SignupForm', () => {
  it('checks the password length before sending', async () => {
    render(<SignupForm />);
    fill('Your name', 'Priya');
    fill('Email address', 'priya@example.com');
    fill('Password', 'short');
    await submit(/create account/i);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 10 characters.')).toBeTruthy();
  });

  it('shows an API field error beside its field', async () => {
    post.mockResolvedValue(
      reply(409, {
        error: {
          code: 'EMAIL_TAKEN',
          message: 'An account with this email already exists. Sign in instead.',
          details: [{ field: 'email', messages: ['An account with this email already exists.'] }],
        },
        requestId: 'r',
      }),
    );
    render(<SignupForm />);
    fill('Your name', 'Priya');
    fill('Email address', 'priya@example.com');
    fill('Password', 'mehendi at the haveli');
    await submit(/create account/i);

    const email = screen.getByLabelText('Email address');
    await waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    expect(email.getAttribute('aria-describedby')).toContain('email-error');
    expect(screen.getByText('An account with this email already exists.')).toBeTruthy();
    expect(document.activeElement).toBe(email);
  });

  it('goes on to verify the email after creating the account', async () => {
    post.mockResolvedValue(reply(201, { data: {}, requestId: 'r' }));
    render(<SignupForm />);
    fill('Your name', 'Priya');
    fill('Email address', 'priya@example.com');
    fill('Password', 'mehendi at the haveli');
    await submit(/create account/i);
    await waitFor(() => expect(goTo).toHaveBeenCalledWith('/verify-email'));
  });
});

describe('PasswordField', () => {
  it('shows and hides the password with a toggle button', () => {
    render(<PasswordField id="pw" name="pw" label="Password" autoComplete="current-password" />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input.getAttribute('type')).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(input.getAttribute('type')).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('ResetPasswordForm', () => {
  const token = 'Xk29abcdefghijklmnopqrstuvwxyz0123456789_-A';

  it('takes the secret from the link and removes it from the address bar', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
    post.mockResolvedValue(reply(204));
    render(<ResetPasswordForm />);

    await screen.findByLabelText('New password');
    expect(window.location.hash).toBe('');
    fill('New password', 'sangeet in the ballroom');
    fill('Confirm new password', 'sangeet in the ballroom');
    await submit(/save new password/i);

    expect(post).toHaveBeenCalledWith('/api/v1/auth/password/reset', {
      body: { token, password: 'sangeet in the ballroom' },
    });
    expect((await screen.findByRole('status')).textContent).toContain('password is changed');
  });

  it('keeps the secret when development mode runs effects twice', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
    post.mockResolvedValue(reply(204));
    render(
      <StrictMode>
        <ResetPasswordForm />
      </StrictMode>,
    );

    await screen.findByLabelText('New password');
    expect(window.location.hash).toBe('');
    fill('New password', 'sangeet in the ballroom');
    fill('Confirm new password', 'sangeet in the ballroom');
    await submit(/save new password/i);
    expect(post).toHaveBeenCalledWith('/api/v1/auth/password/reset', {
      body: { token, password: 'sangeet in the ballroom' },
    });
  });

  it('asks for the password twice, and says when the two differ', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
    render(<ResetPasswordForm />);
    await screen.findByLabelText('New password');

    fill('New password', 'sangeet in the ballroom');
    await submit(/save new password/i);
    const confirm = screen.getByLabelText('Confirm new password');
    expect(confirm.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Enter the same password again.')).toBeTruthy();
    expect(document.activeElement).toBe(confirm);

    fill('Confirm new password', 'sangeet in the garden');
    await submit(/save new password/i);
    expect(screen.getByText('The passwords do not match.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it('explains a link that has expired or was used', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
    post.mockResolvedValue(
      reply(410, { error: { code: 'TOKEN_INVALID', message: 'x' }, requestId: 'r' }),
    );
    render(<ResetPasswordForm />);
    await screen.findByLabelText('New password');
    fill('New password', 'sangeet in the ballroom');
    fill('Confirm new password', 'sangeet in the ballroom');
    await submit(/save new password/i);
    expect((await screen.findByRole('alert')).textContent).toContain('expired');
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeTruthy();
  });

  it('picks up a link pasted into a tab that already shows the page', async () => {
    window.history.replaceState(null, '', '/reset-password');
    render(<ResetPasswordForm />);
    await screen.findByRole('alert');

    act(() => {
      window.history.replaceState(null, '', `/reset-password#token=${token}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(await screen.findByLabelText('New password')).toBeTruthy();
    expect(window.location.hash).toBe('');
  });

  it('asks for the emailed link when the page is opened without one', async () => {
    render(<ResetPasswordForm />);
    expect((await screen.findByRole('alert')).textContent).toContain('needs the link');
  });
});

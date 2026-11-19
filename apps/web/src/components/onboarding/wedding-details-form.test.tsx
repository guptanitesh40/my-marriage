import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeddingDetailsForm } from './wedding-details-form';

const post = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, PATCH: patch, GET: vi.fn() } }));

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

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired() {
  fill('Bride’s name', '  Ananya  ');
  fill('Groom’s name', 'Arjun');
  fill('City', 'Jaipur');
  fill('State', 'Rajasthan');
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /create wedding workspace/i }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  goTo.mockReset();
});

afterEach(cleanup);

describe('WeddingDetailsForm', () => {
  it('points out every missing detail without calling the API, and focuses the first', async () => {
    render(<WeddingDetailsForm />);
    await submit();

    expect(post).not.toHaveBeenCalled();
    const bride = screen.getByLabelText('Bride’s name');
    expect(bride.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(bride);
    for (const message of [
      "Enter the bride's name.",
      "Enter the groom's name.",
      'Enter the city.',
      'Choose the state.',
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    // Optional, so never flagged when empty.
    expect(screen.getByLabelText('Wedding date').getAttribute('aria-invalid')).toBeNull();
  });

  it('creates the wedding without a date, and moves on to inviting the partner', async () => {
    post.mockResolvedValue(reply(201, { data: { id: 'w1' } }));
    render(<WeddingDetailsForm />);
    fillRequired();
    await submit();

    expect(post).toHaveBeenCalledWith('/api/v1/weddings', {
      body: { brideName: 'Ananya', groomName: 'Arjun', city: 'Jaipur', state: 'Rajasthan' },
    });
    expect(goTo).toHaveBeenCalledWith('/onboarding/partner');
    // Stays busy while the next page loads, so it cannot be sent twice.
    const button = screen.getByRole('button', { name: /creating your wedding/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('sends the date when one is given', async () => {
    post.mockResolvedValue(reply(201, { data: { id: 'w1' } }));
    render(<WeddingDetailsForm />);
    fillRequired();
    fill('Wedding date', '2099-12-10');
    await submit();
    expect(post).toHaveBeenCalledWith('/api/v1/weddings', {
      body: expect.objectContaining({ weddingDate: '2099-12-10' }) as unknown,
    });
  });

  it('carries on with the wedding if it was already created by a repeated submission', async () => {
    post.mockResolvedValue(
      reply(409, { error: { code: 'OWNER_ACTIVE_LIMIT', message: 'x' }, requestId: 'r' }),
    );
    render(<WeddingDetailsForm />);
    fillRequired();
    await submit();
    expect(goTo).toHaveBeenCalledWith('/onboarding/partner');
  });

  it('shows an API field error beside its field', async () => {
    post.mockResolvedValue(
      reply(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'x',
          details: [{ field: 'city', messages: ['Use letters, numbers and punctuation only.'] }],
        },
        requestId: 'r',
      }),
    );
    render(<WeddingDetailsForm />);
    fillRequired();
    await submit();
    expect(goTo).not.toHaveBeenCalled();
    expect(screen.getByLabelText('City').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Use letters, numbers and punctuation only.')).toBeTruthy();
  });

  it('says so when My Marriage cannot be reached, and allows another try', async () => {
    post.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<WeddingDetailsForm />);
    fillRequired();
    await submit();
    expect((await screen.findByRole('alert')).textContent).toContain('could not reach');
    expect(
      screen.getByRole('button', { name: /create wedding workspace/i }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('refuses a date in the past', async () => {
    render(<WeddingDetailsForm />);
    fillRequired();
    fill('Wedding date', '2025-02-14');
    await submit();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('Choose today or a later date.')).toBeTruthy();
  });

  describe('editing a wedding that exists', () => {
    const wedding = {
      id: 'w1',
      slug: 'pushpa-nitesh',
      brideName: 'Pushpa',
      groomName: 'Nitesh',
      city: 'Ara',
      state: 'Bihar',
      weddingDate: '2026-02-14',
      status: 'active' as const,
      role: 'owner' as const,
    };

    async function save() {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save and continue/i }));
        await Promise.resolve();
      });
    }

    it('shows the details, saves the changes and moves on', async () => {
      patch.mockResolvedValue(reply(200, { data: wedding }));
      render(<WeddingDetailsForm wedding={wedding} />);
      expect((screen.getByLabelText('Bride’s name') as HTMLInputElement).value).toBe('Pushpa');
      expect((screen.getByLabelText('State') as HTMLSelectElement).value).toBe('Bihar');
      fill('City', 'Patna');
      await save();

      expect(post).not.toHaveBeenCalled();
      expect(patch).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}', {
        params: { path: { weddingId: 'w1' } },
        // The stored date has passed, but keeping it is allowed.
        body: {
          brideName: 'Pushpa',
          groomName: 'Nitesh',
          city: 'Patna',
          state: 'Bihar',
          weddingDate: '2026-02-14',
        },
      });
      expect(goTo).toHaveBeenCalledWith('/onboarding/partner');
    });

    it('removes the date when the field is emptied', async () => {
      patch.mockResolvedValue(reply(200, { data: wedding }));
      render(<WeddingDetailsForm wedding={wedding} />);
      fill('Wedding date', '');
      await save();
      expect(patch).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}', {
        params: { path: { weddingId: 'w1' } },
        body: expect.objectContaining({ weddingDate: null }) as unknown,
      });
    });
  });
});

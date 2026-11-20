import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vendor } from '@/lib/vendors/directory';
import { VendorForm, type VendorEventChoice } from './vendor-form';

const post = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, PATCH: patch, GET: vi.fn() } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

const weddingId = '6740a1b2c3d4e5f601234567';
const haldi = '6740a1b2c3d4e5f601230001';
const sangeet = '6740a1b2c3d4e5f601230002';
const wedding = '6740a1b2c3d4e5f601230003';
const events: VendorEventChoice[] = [
  { id: haldi, title: 'Haldi' },
  { id: sangeet, title: 'Sangeet' },
  { id: wedding, title: 'Wedding' },
];
const onSaved = vi.fn();
const onCancel = vi.fn();

const vendor: Vendor = {
  id: '6740a1b2c3d4e5f601238888',
  name: 'The Marigold Studio',
  category: 'Photography & Videography',
  contactName: 'Rohan Shah',
  phone: '+91 98201 44521',
  email: 'rohan@marigoldstudio.in',
  notes: 'Advance paid.',
  events: [
    { id: haldi, title: 'Haldi' },
    { id: sangeet, title: 'Sangeet' },
  ],
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z',
};

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  refresh.mockReset();
  onSaved.mockReset();
});
afterEach(cleanup);

async function press(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

const field = <T extends HTMLElement>(label: RegExp) => screen.getByLabelText<T>(label);
const type = (label: RegExp, value: string) =>
  fireEvent.change(field<HTMLInputElement>(label), { target: { value } });

function renderForm(existing?: Vendor) {
  render(
    <VendorForm
      weddingId={weddingId}
      vendor={existing}
      events={events}
      onCancel={onCancel}
      onSaved={onSaved}
    />,
  );
}

describe('VendorForm', () => {
  it('adds a vendor with only a name and a category', async () => {
    post.mockResolvedValue(reply(201, { data: { ...vendor, id: 'new' } }));
    renderForm();
    type(/^Vendor \/ business name/, '  Cityline   Travel ');
    fireEvent.change(field(/^Service category/), { target: { value: 'Transportation' } });
    await press(/Save vendor/);
    expect(post).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/vendors', {
      params: { path: { weddingId } },
      body: { name: 'Cityline Travel', category: 'Transportation', eventIds: [] },
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('links several ceremonies and names its own category under Other', async () => {
    post.mockResolvedValue(reply(201, { data: vendor }));
    renderForm();
    type(/^Vendor \/ business name/, 'Sharma Tent House');
    fireEvent.change(field(/^Service category/), { target: { value: 'Other' } });
    type(/^Category name/, 'Tent & Lights');
    type(/^Phone number/, '+91 98200 00000');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wedding' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Haldi' }));
    await press(/Save vendor/);
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      body: {
        name: 'Sharma Tent House',
        category: 'Tent & Lights',
        phone: '+91 98200 00000',
        eventIds: [wedding, haldi],
      },
    });
  });

  it('says what is missing or wrong before sending anything', async () => {
    renderForm();
    type(/^Email address/, 'rohan@');
    await press(/Save vendor/);
    expect(screen.getByText('Enter the vendor or business name.')).toBeTruthy();
    expect(screen.getByText('Choose a service category.')).toBeTruthy();
    expect(screen.getByText('Enter a valid email address, like name@example.com.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field(/^Vendor \/ business name/));
  });

  it('starts an edit from the vendor, and removes what was emptied or unchecked', async () => {
    patch.mockResolvedValue(reply(200, { data: vendor }));
    renderForm(vendor);
    expect(field<HTMLInputElement>(/^Vendor \/ business name/).value).toBe('The Marigold Studio');
    expect(field<HTMLSelectElement>(/^Service category/).value).toBe('Photography & Videography');
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Haldi' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Wedding' }).checked).toBe(false);
    type(/^Phone number/, '');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Haldi' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sangeet' }));
    await press(/Update vendor/);
    expect(patch).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/vendors/{vendorId}', {
      params: { path: { weddingId, vendorId: vendor.id } },
      body: {
        name: 'The Marigold Studio',
        category: 'Photography & Videography',
        contactName: 'Rohan Shah',
        phone: null,
        email: 'rohan@marigoldstudio.in',
        address: null,
        notes: 'Advance paid.',
        eventIds: [],
      },
    });
  });

  it('keeps a category of its own under Other when editing', () => {
    renderForm({ ...vendor, category: 'Tent & Lights' });
    expect(field<HTMLSelectElement>(/^Service category/).value).toBe('Other');
    expect(field<HTMLInputElement>(/^Category name/).value).toBe('Tent & Lights');
  });

  it('shows the API’s field errors, keeps what was typed and refreshes stale ceremonies', async () => {
    post.mockResolvedValue(
      reply(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Choose from this wedding’s events.',
          details: [{ field: 'eventIds', messages: ['Choose from this wedding’s events.'] }],
        },
      }),
    );
    renderForm();
    type(/^Vendor \/ business name/, 'Royal Bloom');
    fireEvent.change(field(/^Service category/), { target: { value: 'Decoration' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Haldi' }));
    await press(/Save vendor/);
    expect(screen.getByText('Choose from this wedding’s events.')).toBeTruthy();
    expect(field<HTMLInputElement>(/^Vendor \/ business name/).value).toBe('Royal Bloom');
    expect(refresh).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('says when the network failed, and can be sent again', async () => {
    post.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    post.mockResolvedValueOnce(reply(201, { data: vendor }));
    renderForm();
    type(/^Vendor \/ business name/, 'Royal Bloom');
    fireEvent.change(field(/^Service category/), { target: { value: 'Decoration' } });
    await press(/Save vendor/);
    expect(screen.getByRole('alert').textContent).toContain('Unable to add the vendor');
    await press(/Save vendor/);
    expect(onSaved).toHaveBeenCalled();
  });
});

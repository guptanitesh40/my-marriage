import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@my-marriage/contracts';
import { WorkspaceShell } from './workspace-shell';

vi.mock('@/lib/api/browser', () => ({ api: { POST: vi.fn(), GET: vi.fn() } }));
const pathname = vi.hoisted(() => ({ current: '/weddings/6740a1b2c3d4e5f601234567' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

afterEach(cleanup);

const wedding: components['schemas']['WeddingDto'] = {
  id: '6740a1b2c3d4e5f601234567',
  slug: 'ananya-arjun',
  brideName: 'Ananya',
  groomName: 'Arjun',
  city: 'Jaipur',
  state: 'Rajasthan',
  weddingDate: '2027-12-10',
  status: 'active',
  role: 'owner',
};
const user = { displayName: 'Ananya Sharma', email: 'ananya@example.com' };

const other: components['schemas']['WeddingDto'] = {
  ...wedding,
  id: '6740a1b2c3d4e5f601234999',
  slug: 'meera-dev',
  brideName: 'Meera',
  groomName: 'Dev',
  city: 'Pune',
  role: 'manager',
};

type MyInvite = components['schemas']['MyInviteDto'];

const handOver: MyInvite = {
  id: '6740a1b2c3d4e5f601234aaa',
  brideName: 'Divya',
  groomName: 'Hitesh',
  city: 'Ara',
  state: 'Bihar',
  invitedByName: 'Nitesh Gupta',
  role: 'owner',
  handOver: true,
  expiresAt: '2099-01-08T10:00:00.000Z',
};

function renderShell(overrides: Partial<typeof wedding> = {}, invites: MyInvite[] = []) {
  const current = { ...wedding, ...overrides };
  return render(
    <WorkspaceShell wedding={current} weddings={[current, other]} invites={invites} user={user}>
      <h1>Page content</h1>
    </WorkspaceShell>,
  );
}

describe('WorkspaceShell', () => {
  it('names the wedding, the visitor’s role and who is signed in', () => {
    renderShell();
    expect(screen.getByRole('complementary').textContent).toContain('Ananya & Arjun');
    expect(screen.getByRole('banner').textContent).toContain('Ananya & Arjun — Jaipur 2027');
    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.getByText('Ananya Sharma')).toBeTruthy();
    expect(screen.getByText('ananya@example.com')).toBeTruthy();
    expect(screen.getByText('AS')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toContain('Page content');
  });

  it('shows a manager as a manager, without the team page, and leaves out the year without a date', () => {
    renderShell({ role: 'manager', weddingDate: undefined });
    expect(screen.getByText('Manager')).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Workspace' });
    expect(within(nav).queryByText('Team & Family')).toBeNull();
    expect(screen.getByRole('banner').textContent).toContain('Ananya & Arjun — Jaipur');
    expect(screen.getByRole('banner').textContent).not.toMatch(/\d{4}/);
  });

  it('says when an invitation to another wedding is waiting, and where to answer it', () => {
    renderShell({}, [handOver]);
    const banner = screen.getByRole('region', { name: 'Invitations waiting' });
    expect(banner.textContent).toContain(
      'Nitesh Gupta invited you to take over as an owner of Divya & Hitesh’s wedding.',
    );
    expect(
      within(banner).getByRole('link', { name: 'Review invitation' }).getAttribute('href'),
    ).toBe('/invitations');
    cleanup();
    renderShell({}, [handOver, { ...handOver, id: 'x2', role: 'manager', handOver: false }]);
    expect(screen.getByRole('region', { name: 'Invitations waiting' }).textContent).toContain(
      '2 invitations to other weddings are waiting',
    );
    cleanup();
    renderShell();
    expect(screen.queryByRole('region', { name: 'Invitations waiting' })).toBeNull();
  });

  it('links every section', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Workspace' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Overview', '/weddings/6740a1b2c3d4e5f601234567'],
      ['Events', '/weddings/6740a1b2c3d4e5f601234567/events'],
      ['Tasks', '/weddings/6740a1b2c3d4e5f601234567/tasks'],
      ['Guests & RSVP', '/weddings/6740a1b2c3d4e5f601234567/guests'],
      ['Expenses & Budget', '/weddings/6740a1b2c3d4e5f601234567/expenses'],
      ['Vendors', '/weddings/6740a1b2c3d4e5f601234567/vendors'],
      ['Wedding Website', '/weddings/6740a1b2c3d4e5f601234567/website'],
      ['Photos & QR Drive', '/weddings/6740a1b2c3d4e5f601234567/photos'],
      ['Team & Family', '/weddings/6740a1b2c3d4e5f601234567/team'],
      ['Settings', '/weddings/6740a1b2c3d4e5f601234567/settings'],
    ]);
  });

  it.each([
    ['/weddings/6740a1b2c3d4e5f601234567', 'Overview'],
    ['/weddings/6740a1b2c3d4e5f601234567/events', 'Events'],
    ['/weddings/6740a1b2c3d4e5f601234567/tasks', 'Tasks'],
    ['/weddings/6740a1b2c3d4e5f601234567/vendors', 'Vendors'],
    ['/weddings/6740a1b2c3d4e5f601234567/expenses', 'Expenses & Budget'],
  ])('marks the current section on %s', (path, current) => {
    pathname.current = path;
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Workspace' });
    const marked = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent);
    expect(marked).toEqual([current]);
  });

  it.each([
    ['archived', 'Archived'],
    ['deletion_pending', 'Deletion pending'],
  ] as const)('says when the wedding is %s', (status, label) => {
    renderShell({ status });
    expect(within(screen.getByRole('banner')).getByText(label)).toBeTruthy();
  });

  it('switches between the visitor’s weddings, or starts another', () => {
    renderShell({ role: 'admin' });
    const aside = screen.getByRole('complementary');
    const toggle = within(aside).getByRole('button', { name: /Switch wedding/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const links = within(aside).getAllByRole('link', { name: /Ananya & Arjun|Meera & Dev/ });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/weddings/6740a1b2c3d4e5f601234567',
      '/weddings/6740a1b2c3d4e5f601234999',
    ]);
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    expect(links[0]?.textContent).toContain('Admin');
    expect(links[1]?.textContent).toContain('Manager');
    expect(
      within(aside).getByRole('link', { name: 'Start another wedding' }).getAttribute('href'),
    ).toBe('/onboarding?start=new');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows no status for an active wedding', () => {
    renderShell();
    expect(screen.queryByText('Archived')).toBeNull();
  });
});

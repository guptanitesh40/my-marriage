import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenOnArrival } from './open-on-arrival';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/weddings/w1/tasks',
  useSearchParams: () => search,
}));

describe('OpenOnArrival', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('opens the form once when the page is reached with ?new=1, then drops the parameter', () => {
    search = new URLSearchParams({ view: 'overdue', new: '1' });
    const open = vi.fn();
    const { rerender } = render(<OpenOnArrival open={open} />);
    rerender(<OpenOnArrival open={open} />);
    expect(open).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/weddings/w1/tasks?view=overdue', { scroll: false });
  });

  it('does nothing without the parameter', () => {
    search = new URLSearchParams({ view: 'overdue' });
    const open = vi.fn();
    render(<OpenOnArrival open={open} />);
    expect(open).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does nothing on a read-only page, where there is no form', () => {
    search = new URLSearchParams({ new: '1' });
    render(<OpenOnArrival open={null} />);
    expect(replace).not.toHaveBeenCalled();
  });
});

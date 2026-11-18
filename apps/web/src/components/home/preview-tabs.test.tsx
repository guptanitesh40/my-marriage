import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreviewTabs } from './preview-tabs';

afterEach(cleanup);

const tabs = [
  { id: 'a', label: 'Tasks', panel: <p>Task panel</p> },
  { id: 'b', label: 'Expenses', panel: <p>Expense panel</p> },
  { id: 'c', label: 'Guests', panel: <p>Guest panel</p> },
];

function tab(index: number): HTMLElement {
  const element = screen.getAllByRole('tab')[index];
  if (!element) throw new Error(`No tab at index ${index}`);
  return element;
}

function selected() {
  return screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-selected'));
}

describe('PreviewTabs', () => {
  it('shows the first panel and links each tab to its panel', () => {
    render(<PreviewTabs tabs={tabs} />);
    expect(selected()).toEqual(['true', 'false', 'false']);
    const panel = screen.getByRole('tabpanel');
    expect(panel.textContent).toBe('Task panel');
    expect(panel.getAttribute('aria-labelledby')).toBe(screen.getAllByRole('tab')[0]?.id);
  });

  it('switches panels on click', () => {
    render(<PreviewTabs tabs={tabs} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Guests' }));
    expect(selected()).toEqual(['false', 'false', 'true']);
    expect(screen.getByRole('tabpanel').textContent).toBe('Guest panel');
  });

  it('supports arrow keys, Home and End, wrapping around, and moves focus', () => {
    render(<PreviewTabs tabs={tabs} />);
    fireEvent.keyDown(tab(0), { key: 'ArrowRight' });
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(document.activeElement).toBe(tab(1));
    fireEvent.keyDown(tab(1), { key: 'End' });
    expect(document.activeElement).toBe(tab(2));
    fireEvent.keyDown(tab(2), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab(0));
    fireEvent.keyDown(tab(0), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab(2));
    fireEvent.keyDown(tab(2), { key: 'Home' });
    expect(selected()).toEqual(['true', 'false', 'false']);
  });

  it('keeps only the selected tab in the tab order', () => {
    render(<PreviewTabs tabs={tabs} />);
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });
});

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import HomePage from './page';

it('renders the product promise as the page heading', () => {
  render(<HomePage />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/wedding in one place/);
});

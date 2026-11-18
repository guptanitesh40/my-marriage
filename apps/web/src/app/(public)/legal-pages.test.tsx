import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PrivacyPage, { metadata as privacyMetadata } from './privacy/page';
import TermsPage, { metadata as termsMetadata } from './terms/page';

afterEach(cleanup);

describe.each([
  ['privacy', PrivacyPage, privacyMetadata, /privacy policy/i],
  ['terms', TermsPage, termsMetadata, /terms of use/i],
])('%s page', (_name, Page, metadata, title) => {
  it('has one h1 and a visible draft notice', () => {
    render(<Page />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(title);
    expect(screen.getByRole('note').textContent).toMatch(/draft, pending legal review/i);
  });

  it('stays out of search results while it is a draft', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { referenceOf, ServerError } from './server-error';

afterEach(cleanup);

function serverError(message: string, digest?: string): Error {
  return Object.assign(new Error(message), digest === undefined ? {} : { digest });
}

describe('ServerError', () => {
  it('never shows what failed, only the reference, and tries again', () => {
    const retry = vi.fn();
    const secret =
      'MongoServerError: connect ECONNREFUSED 10.0.0.12:27017 at /var/task/dist/main.js';
    render(<ServerError error={serverError(secret, '1234567890')} retry={retry} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'We couldn’t load this page' }),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain('ECONNREFUSED');
    expect(document.body.textContent).not.toContain('main.js');
    expect(screen.getByText('1234567890').tagName).toBe('CODE');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Back to home' }).getAttribute('href')).toBe('/');
  });

  it('shows no reference for an error thrown in the browser', () => {
    render(<ServerError error={serverError('TypeError: x is undefined')} retry={() => {}} />);
    expect(document.body.textContent).not.toContain('reference');
    expect(document.body.textContent).not.toContain('x is undefined');
  });
});

describe('referenceOf', () => {
  it('reads only a non-empty digest', () => {
    expect(referenceOf(serverError('a', 'abc'))).toBe('abc');
    expect(referenceOf(serverError('a', ''))).toBeUndefined();
    expect(referenceOf('a string was thrown')).toBeUndefined();
    expect(referenceOf({ digest: 'not an Error' })).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { expenseInputErrors } from './input';

describe('expense input', () => {
  it('needs a name, a category and an amount', () => {
    expect(
      Object.keys(expenseInputErrors({ title: '', category: '', amount: '', notes: '' })).sort(),
    ).toEqual(['amountPaise', 'category', 'title']);
    expect(
      expenseInputErrors({
        title: 'Catering',
        category: 'Catering',
        amount: '1,50,000',
        notes: '',
      }),
    ).toEqual({});
  });

  it('refuses a malformed amount and over-long text', () => {
    const errors = expenseInputErrors({
      title: 'x'.repeat(121),
      category: 'Catering',
      amount: '-5',
      notes: 'y'.repeat(4001),
    });
    expect(Object.keys(errors).sort()).toEqual(['amountPaise', 'notes', 'title']);
  });
});

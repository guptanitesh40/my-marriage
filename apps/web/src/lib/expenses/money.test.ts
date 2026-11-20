import { describe, expect, it } from 'vitest';
import { amountProblem, formatInr, parseRupees, rupeesInput, share } from './money';

describe('money', () => {
  it('shows rupees with Indian grouping, and paise only when there are any', () => {
    expect(formatInr(0)).toBe('₹0');
    expect(formatInr(8000000)).toBe('₹80,000');
    expect(formatInr(15000000)).toBe('₹1,50,000');
    expect(formatInr(29500000)).toBe('₹2,95,000');
    expect(formatInr(1000000050)).toBe('₹1,00,00,000.50');
    expect(formatInr(-800000)).toBe('−₹8,000');
  });

  it('reads what people type as exact paise, without floating point', () => {
    expect(parseRupees('80,000')).toBe(8000000);
    expect(parseRupees('₹ 1,50,000')).toBe(15000000);
    expect(parseRupees('80000.5')).toBe(8000050);
    expect(parseRupees('0.29')).toBe(29);
    expect(parseRupees('1.005')).toBeNull();
    expect(parseRupees('-500')).toBeNull();
    expect(parseRupees('five')).toBeNull();
    expect(parseRupees('')).toBeNull();
  });

  it('turns paise back into the text the form edits', () => {
    expect(rupeesInput(8000000)).toBe('80000');
    expect(rupeesInput(8000050)).toBe('80000.50');
  });

  it('says what is wrong with an amount', () => {
    expect(amountProblem('')).toBe('Enter an amount greater than ₹0.');
    expect(amountProblem('0')).toBe('Enter an amount greater than ₹0.');
    expect(amountProblem('12abc')).toBe('Enter an amount like 80,000 or 80,000.50.');
    expect(amountProblem('10000000000')).toBe('Enter a smaller amount.');
    expect(amountProblem('45,000')).toBeUndefined();
  });

  it('works out a share for the progress bars', () => {
    expect(share(3000000, 8000000)).toBe(38);
    expect(share(9, 0)).toBe(100);
    expect(share(0, 0)).toBe(0);
    expect(share(10, 5)).toBe(100);
  });
});

import { describe, expect, it } from 'vitest';
import { taskInputErrors } from './input';

const blank = { title: 'Book band', description: '', dueDate: '', dueTime: '' };

describe('taskInputErrors', () => {
  it('needs only a title', () => {
    expect(taskInputErrors(blank)).toEqual({});
    expect(taskInputErrors({ ...blank, title: '' })).toEqual({
      title: 'Enter what needs to be done.',
    });
  });

  it('checks lengths and a time without a day', () => {
    expect(
      taskInputErrors({
        title: 'x'.repeat(121),
        description: 'x'.repeat(2001),
        dueDate: '',
        dueTime: '10:00',
      }),
    ).toEqual({
      title: 'Use 120 characters or fewer.',
      description: 'Use 2000 characters or fewer.',
      dueTime: 'Choose the day first, then the time.',
    });
  });
});

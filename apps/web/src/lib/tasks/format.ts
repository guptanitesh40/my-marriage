import type { Task } from './filters';

export type DueTone = 'overdue' | 'soon' | 'later' | 'none';

const DAY = 86_400_000;

/** "8 Dec", with the year when it is not this year's. Wall-clock values, formatted as UTC. */
function shortDay(day: string, today: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
  const text = `${part({ day: 'numeric' })} ${part({ month: 'short' })}`;
  return day.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${part({ year: 'numeric' })}`;
}

function clock(time: string): string {
  return new Date(`1970-01-01T${time}:00Z`).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/**
 * When a task is due, as the list says it (Stitch "Tasks Management"):
 * "8 Dec · Overdue", "Today, 2:00 pm", "Tomorrow", "10 Dec · In 3 days",
 * "12 Dec 2027". Finished tasks just show the day. `today` is India's.
 */
export function dueLabel(
  task: Pick<Task, 'dueDate' | 'dueTime' | 'overdue' | 'state'>,
  today: string,
): { text: string; tone: DueTone } {
  if (!task.dueDate) return { text: 'No due date', tone: 'none' };
  const time = task.dueTime ? `, ${clock(task.dueTime)}` : '';
  const day = shortDay(task.dueDate, today);
  if (task.overdue) return { text: `${day}${time} · Overdue`, tone: 'overdue' };
  if (task.state === 'completed' || task.state === 'cancelled') {
    return { text: `${day}${time}`, tone: 'later' };
  }
  const days = Math.round((Date.parse(task.dueDate) - Date.parse(today)) / DAY);
  if (days === 0) return { text: `Today${time}`, tone: 'soon' };
  if (days === 1) return { text: `Tomorrow${time}`, tone: 'soon' };
  if (days > 1 && days <= 7) return { text: `${day}${time} · In ${days} days`, tone: 'soon' };
  return { text: `${day}${time}`, tone: 'later' };
}

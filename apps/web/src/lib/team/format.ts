/** "14 Jan 2027", in India. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** "in 6 days", "tomorrow", "today"; for an invitation's link. */
export function expiresIn(iso: string, now = Date.now()): string {
  const days = Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
  if (days <= 0) return 'today';
  return new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' }).format(days, 'day');
}

/** "3 open tasks", "1 open task". */
export function openTasks(count: number): string {
  return `${count} open ${count === 1 ? 'task' : 'tasks'}`;
}

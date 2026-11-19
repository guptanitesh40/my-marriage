/**
 * Where to go after signing in, from a `?next=` value — or null when it is
 * missing or unsafe. Only a path on this site is accepted; anything that a
 * browser could resolve to another site (`//evil.example`, `/\evil.example`,
 * `https://…`, `javascript:…`) is refused, so a crafted sign-in link cannot
 * send someone to a look-alike page afterwards (an open redirect).
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || value.length > 512) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  // Control characters and backslashes are folded or stripped by URL parsers.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  try {
    const parsed = new URL(value, 'https://placeholder.invalid');
    if (parsed.origin !== 'https://placeholder.invalid') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

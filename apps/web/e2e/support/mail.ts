import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { MAIL_DIR } from './paths';

interface WrittenEmail {
  to: string;
  subject: string;
  text: string;
}

/**
 * The newest email to `to` whose subject matches, as written by the API's
 * file mail transport — waiting for the worker to send it, and for `count`
 * such emails when an earlier one was replaced (a resend).
 */
export async function waitForEmail(
  to: string,
  subject: RegExp,
  { count = 1 }: { count?: number } = {},
): Promise<WrittenEmail> {
  let found: WrittenEmail | undefined;
  await expect
    .poll(
      async () => {
        const names = (await readdir(MAIL_DIR).catch(() => [])).filter((name) =>
          name.endsWith('.json'),
        );
        // File names start with a timestamp, so sorting puts the newest last.
        const emails = await Promise.all(
          names
            .sort()
            .map(
              async (name) =>
                JSON.parse(await readFile(path.join(MAIL_DIR, name), 'utf8')) as WrittenEmail,
            ),
        );
        const matching = emails.filter((email) => email.to === to && subject.test(email.subject));
        found = matching.length >= count ? matching.at(-1) : undefined;
        return found !== undefined;
      },
      { message: `email "${subject.source}" to ${to}`, timeout: 20_000 },
    )
    .toBe(true);
  if (!found) throw new Error('unreachable');
  return found;
}

/** The link to our site in an email. */
export function linkIn(email: WrittenEmail): string {
  const link = /http:\/\/localhost:\d+\/[^\s]+/.exec(email.text)?.[0];
  if (!link) throw new Error(`No link in "${email.subject}"`);
  return link;
}

let counter = 0;
/** A new address per call, so tests never collide on the unique email. */
export function uniqueEmail(name = 'priya'): string {
  counter += 1;
  return `${name}.${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 6)}@example.com`;
}

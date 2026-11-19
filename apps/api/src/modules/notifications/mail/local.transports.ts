import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { MailTransport, type OutgoingEmail, type SentEmail } from './mail-transport.js';
import { Traced } from '../../../platform/tracing.js';

/**
 * Local development: writes each email to a directory (git-ignored) as an
 * HTML file to open in a browser, and a JSON file with every field. The log
 * line names the file, never its content — the email holds a live link.
 */
@Traced()
export class FileMailTransport extends MailTransport {
  private readonly logger = new Logger(FileMailTransport.name);
  private readonly dir: string;

  constructor(dir: string) {
    super();
    this.dir = resolve(dir);
  }

  async send(email: OutgoingEmail): Promise<SentEmail> {
    await mkdir(this.dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = join(this.dir, `${stamp}-${email.idempotencyKey.replace(/[^\w-]/g, '_')}`);
    await writeFile(`${base}.html`, email.html);
    await writeFile(`${base}.json`, `${JSON.stringify(email, null, 2)}\n`);
    this.logger.log(`Email written to ${base}.html`);
    return {};
  }
}

/** Integration tests: keeps every email in memory, and can be told to fail. */
export class MemoryMailTransport extends MailTransport {
  readonly sent: OutgoingEmail[] = [];
  private failures: Error[] = [];

  send(email: OutgoingEmail): Promise<SentEmail> {
    const failure = this.failures.shift();
    if (failure) return Promise.reject(failure);
    this.sent.push(email);
    return Promise.resolve({ providerMessageId: `memory_${this.sent.length}_${Date.now()}` });
  }

  /** The next `send` calls fail with these errors, in order. */
  failNext(...errors: Error[]): void {
    this.failures.push(...errors);
  }

  clear(): void {
    this.sent.length = 0;
    this.failures = [];
  }
}

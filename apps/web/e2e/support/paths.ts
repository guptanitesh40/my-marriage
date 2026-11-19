import path from 'node:path';

/** Where the API's file mail transport writes emails during browser tests. */
export const MAIL_DIR = path.join(__dirname, '..', '..', '.e2e-mail');

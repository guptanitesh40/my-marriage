# 0007 — Email through Gmail SMTP instead of Resend

Date: 2026-11-19 · Status: accepted · Supersedes the Resend parts of 0003

Resend's test sender delivers only to the address the Resend account was
created with; sending to anyone else needs a domain verified in Resend, which
the project does not have. The partner invitation could not reach the
partner. The owner decided to send email through Gmail over SMTP instead,
and to remove Resend completely.

## What changed

- **`MAIL_TRANSPORT=smtp`** replaces `resend` and is required in production.
  `file` (local default) and `memory` (integration tests) are unchanged.
- **Settings:** `SMTP_USER` (the Gmail address), `SMTP_PASSWORD` (a Google
  App Password, a secret), `SMTP_HOST` (default `smtp.gmail.com`),
  `SMTP_PORT` (default 465, TLS; 587 uses STARTTLS, required). `MAIL_FROM`
  defaults to `My Marriage <SMTP_USER>`. `RESEND_API_KEY` is gone.
- **`SmtpTransport`** (`modules/notifications/mail/smtp.transport.ts`)
  replaces `ResendTransport`. Failures are stored as our own codes, never the
  server's message (which can quote the address):

  | Failure                             | Code                      | Retried |
  | ----------------------------------- | ------------------------- | ------- |
  | Wrong user or App Password          | `SMTP_AUTH_FAILED`        | no      |
  | Gmail's daily limit (550 5.4.5)     | `SMTP_DAILY_LIMIT`        | no      |
  | Other 5xx reply                     | `SMTP_<status>`           | no      |
  | Recipient refused, no status        | `SMTP_RECIPIENT_REJECTED` | no      |
  | 4xx reply (try later)               | `SMTP_<status>`           | yes     |
  | Network, TLS, DNS or timeout (15 s) | `SMTP_UNREACHABLE`        | yes     |
  | Anything else                       | `SMTP_UNKNOWN`            | yes     |

- **Specifications updated:** the reference documents now name Gmail SMTP.
  The Resend delivery webhook (`POST /webhooks/resend`, signed with svix)
  and the `resend_webhook_events` collection (schema §4.25) are removed:
  Gmail sends no delivery events. The privacy page lists Google (Gmail) as
  the email provider instead of Resend; it is still a draft for legal
  review.

## Decisions

- **Nodemailer** (10.3.1) is the one new dependency. Speaking SMTP correctly
  (TLS, authentication, MIME encoding of a subject such as "Pushpa &
  Nitesh’s wedding", line lengths) is too much to write ourselves, and
  `@nestjs/mail` is still 0.0.2. Nodemailer has no dependencies of its own
  and ships its own types.
- **No idempotency key.** Resend refused a second send of the same email;
  SMTP cannot. Every attempt at one email now carries the same Message-ID
  (from the notification's idempotency key), so a copy sent again after a
  crash is usually filed by Gmail as a duplicate. Not guaranteed: in that
  rare case the recipient may get two emails, both with working links.
- **"Sent" means Gmail accepted the email**, never that it arrived (PRD
  INV-08). There are no bounce or delivery reports.

## Limits the owner accepted

- About 500 emails a day from one Gmail account; more fail with
  `SMTP_DAILY_LIMIT` and can be resent the next day.
- Emails come from a Gmail address (or an alias added to the account under
  "Send mail as"), not from a domain of our own.
- Google's terms for personal accounts are not meant for bulk mail. Before
  sending guest invitations at scale, review a Google Workspace account or
  a transactional provider again.

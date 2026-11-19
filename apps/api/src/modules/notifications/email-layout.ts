import type { ComposedEmail } from './email-composer.js';

/**
 * The layout every email shares: plain HTML with inline styles (email
 * clients ignore stylesheets) plus a text version. No template engine is
 * needed for short messages. The brand colours are written out because email
 * cannot use the web app's design tokens. Every value is escaped.
 */

const BRAND = { ink: '#1c1c16', muted: '#404845', primary: '#184539', surface: '#fdf9f0' };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailLayout {
  title: string;
  /** Omitted when the recipient may not have an account yet: "Hello,". */
  greetingName?: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote: string;
}

export function renderEmail(layout: EmailLayout): Pick<ComposedEmail, 'html' | 'text'> {
  const greeting = layout.greetingName ? `Hello ${escapeHtml(layout.greetingName)},` : 'Hello,';
  const paragraphs = layout.paragraphs
    .map((text) => `<p style="margin:0 0 16px">${escapeHtml(text)}</p>`)
    .join('');
  const button = layout.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(layout.action.url)}" ` +
      `style="display:inline-block;background:${BRAND.primary};color:#ffffff;` +
      `text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">` +
      `${escapeHtml(layout.action.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:${BRAND.muted}">` +
      `If the button does not work, copy this link into your browser:<br>` +
      `<span style="word-break:break-all">${escapeHtml(layout.action.url)}</span></p>`
    : '';

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width">` +
    `<title>${escapeHtml(layout.title)}</title></head>` +
    `<body style="margin:0;background:${BRAND.surface};font-family:Helvetica,Arial,sans-serif;` +
    `color:${BRAND.ink};font-size:15px;line-height:1.6">` +
    `<div style="max-width:520px;margin:0 auto;padding:32px 24px">` +
    `<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;color:${BRAND.primary}">` +
    `My Marriage</p>` +
    `<p style="margin:0 0 16px">${greeting}</p>${paragraphs}${button}` +
    `<p style="margin:24px 0 0;font-size:13px;color:${BRAND.muted}">` +
    `${escapeHtml(layout.footnote)}</p></div></body></html>`;

  const text = [
    layout.greetingName ? `Hello ${layout.greetingName},` : 'Hello,',
    '',
    ...layout.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...(layout.action ? [`${layout.action.label}: ${layout.action.url}`, ''] : []),
    layout.footnote,
    '',
    '— My Marriage',
  ].join('\n');

  return { html, text };
}

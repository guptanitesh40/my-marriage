import { describe, expect, it } from 'vitest';
import type { EventBrief } from '../events/events.service.js';
import { guestInviteMessage } from './guest-emails.js';

const event = (brief: Partial<EventBrief> & { title: string }): EventBrief => ({
  id: brief.title,
  deleted: false,
  cancelled: false,
  completed: false,
  scheduleVersion: 0,
  timeZone: 'Asia/Kolkata',
  ...brief,
});

const message = guestInviteMessage({
  coupleName: 'Pushpa & Nitesh',
  guestName: 'Rajesh <Sharma>',
  partySize: 6,
  link: 'https://example.com/invitation#t=abc_DEF-123',
  events: [
    event({
      title: 'Tilak',
      startDate: '2027-02-10',
      startTime: '16:00',
      venueName: 'Groom’s family home',
      venueAddress: 'Ara, Bihar',
    }),
    event({ title: 'Reception' }),
  ],
});

describe('guestInviteMessage', () => {
  it('lists each celebration with its own date block, time and place', () => {
    expect(message.subject).toBe('You’re invited to Pushpa & Nitesh’s wedding');
    expect(message.html).toContain('YOUR 2 CELEBRATIONS');
    expect(message.html).toContain('>FEB<');
    expect(message.html).toContain('>10<');
    expect(message.html).toContain('Wednesday · 4:00 pm');
    expect(message.html).toContain('Groom’s family home, Ara, Bihar');
    expect(message.html).toContain('Date to be announced');
    expect(message.html).toContain('Venue to be announced');
    expect(message.html).toContain('up to 6 people');
  });

  it('escapes what organizers typed and carries the private link to the button', () => {
    expect(message.html).toContain('Dear Rajesh &lt;Sharma&gt;,');
    expect(message.html).not.toContain('<Sharma>');
    expect(message.html).toContain('Pushpa &amp; Nitesh');
    expect(message.html).toContain('href="https://example.com/invitation#t=abc_DEF-123"');
    expect(message.html).toContain('Private to your family.');
  });

  it('reads well as plain text too', () => {
    expect(message.text).toContain(
      '• Tilak\n  10 Feb 2027, Wednesday · 4:00 pm\n  Groom’s family home, Ara, Bihar',
    );
    expect(message.text).toContain('• Reception\n  Date to be announced\n  Venue to be announced');
    expect(message.text).toContain(
      'RSVP for your family: https://example.com/invitation#t=abc_DEF-123',
    );
  });
});

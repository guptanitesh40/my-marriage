import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GuestInviteComposer } from '../src/modules/guests/guest-invite.composer.js';
import { GuestReminderComposer } from '../src/modules/guests/guest-reminder.composer.js';
import { GuestRemindersService } from '../src/modules/guests/guest-reminders.service.js';
import { GUEST_RATE_LIMITS } from '../src/modules/guests/guest-policy.js';
import { GuestsModule } from '../src/modules/guests/guests.module.js';
import { addDays, localNow } from '../src/modules/guests/reminder-schedule.js';
import { GuestReminder } from '../src/modules/guests/schemas/guest-reminder.schema.js';
import { WeddingEvent } from '../src/modules/events/schemas/event.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { RateLimiter } from '../src/platform/rate-limit.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';

interface Skipped {
  count: number;
  names: string[];
}
interface PreviewBody {
  recipients: number;
  skipped: Record<'noEmail' | 'notShared' | 'linkOff' | 'remindersOff', Skipped>;
  emailsLeftToday: number;
}

const tokenOf = (url: string) => url.split('#t=')[1] ?? '';

describe('Guest reminders (integration)', () => {
  let app: NestExpressApplication;
  let worker: TestWorker;
  let service: GuestRemindersService;
  let weddings: Model<Wedding>;
  let reminders: Model<GuestReminder>;
  let events: Model<WeddingEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    worker = await createTestWorker({
      imports: [GuestsModule],
      composers: [GuestInviteComposer, GuestReminderComposer],
    });
    service = app.get(GuestRemindersService);
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    reminders = app.get<Model<GuestReminder>>(getModelToken(GuestReminder.name));
    events = app.get<Model<WeddingEvent>>(getModelToken(WeddingEvent.name));
  });

  afterAll(async () => {
    await worker.context.close();
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const today = () => localNow(new Date(), 'Asia/Kolkata').date;

  function send(
    method: 'get' | 'post' | 'patch' | 'put',
    cookie: string,
    path: string,
    body?: object,
  ) {
    const req = request(server())[method](`/api/v1${path}`).set('Cookie', cookie);
    return body === undefined ? req : req.send(body);
  }

  async function ok<T>(res: request.Test | Promise<request.Response>, status: number): Promise<T> {
    const done = await res;
    expect(done.status, JSON.stringify(done.body)).toBe(status);
    return (done.body as { data: T }).data;
  }

  /**
   * A wedding with Haldi in 7 days and the Wedding in 20, and guests
   * covering every case: Rajesh and Priya can be reminded; Kavya has no
   * email, Suresh's invitation was never shared, Vikram's link is off and
   * Neha turned reminders off; Rohit is invited to nothing.
   */
  async function plannedWedding() {
    const owner = await signupVerified(app, { displayName: 'Ananya Sharma' });
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const { id: weddingId } = await ok<{ id: string }>(
      send('post', owner.cookie, '/weddings', {
        brideName: `Ananya ${tag}`,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
      }),
      201,
    );
    const event = async (title: string, inDays: number) =>
      (
        await ok<{ id: string }>(
          send('post', owner.cookie, `/weddings/${weddingId}/events`, {
            title,
            startDate: addDays(today(), inDays),
            startTime: '10:00',
            venue: { name: 'The Carlton palace' },
          }),
          201,
        )
      ).id;
    const haldi = await event('Haldi', 7);
    const wedding = await event('Wedding', 20);
    const guests = `/weddings/${weddingId}/guests`;
    const guest = async (
      name: string,
      body: object,
      link: 'shared' | 'none' | 'off' = 'shared',
    ) => {
      const { guest: made } = await ok<{ guest: { id: string } }>(
        send('post', owner.cookie, guests, { name, partySize: 5, ...body }),
        201,
      );
      let url = '';
      if (link !== 'none') {
        url = (
          await ok<{ secretUrl: string }>(
            send('post', owner.cookie, `${guests}/${made.id}/invitation-links`, {}),
            201,
          )
        ).secretUrl;
      }
      if (link === 'off') {
        await ok(send('post', owner.cookie, `${guests}/${made.id}/invitation-links/revoke`), 200);
      }
      return { id: made.id, url };
    };
    const both = [haldi, wedding];
    const rajesh = await guest('Rajesh Sharma', {
      email: `rajesh.${tag}@example.com`,
      eventIds: both,
    });
    const priya = await guest('Priya Verma', {
      email: `priya.${tag}@example.com`,
      eventIds: [wedding],
    });
    const kavya = await guest('Kavya Iyer', { eventIds: both });
    const suresh = await guest(
      'Suresh Yadav',
      { email: `suresh.${tag}@example.com`, eventIds: both },
      'none',
    );
    const vikram = await guest(
      'Vikram Singh',
      { email: `vikram.${tag}@example.com`, eventIds: both },
      'off',
    );
    const neha = await guest('Neha Jha', { email: `neha.${tag}@example.com`, eventIds: both });
    await guest('Rohit Pandey', { email: `rohit.${tag}@example.com` });
    const mail = (name: string) => `${name}.${tag}@example.com`;
    return {
      owner,
      weddingId,
      guests,
      haldi,
      wedding,
      rajesh,
      priya,
      kavya,
      suresh,
      vikram,
      neha,
      mail,
    };
  }

  /** Opens a guest's link and returns its cookie. */
  async function asGuest(url: string) {
    const res = await request(server())
      .post('/api/v1/guest-access/exchange')
      .send({ token: tokenOf(url) });
    expect(res.status).toBe(204);
    const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    return set.find((c) => c.startsWith('mm_guest_session='))?.split(';')[0] ?? '';
  }

  async function answerHaldi(url: string) {
    const cookie = await asGuest(url);
    const view = await ok<{
      events: { invitationId: string; title: string; rsvp: { responseVersion: number } }[];
    }>(send('get', cookie, '/guest-access/invitation'), 200);
    const haldi = view.events.find((event) => event.title === 'Haldi');
    await ok(
      send('patch', cookie, `/guest-access/events/${haldi?.invitationId}/rsvp`, {
        status: 'attending',
        attendingCount: 4,
        responseVersion: haldi?.rsvp.responseVersion,
      }),
      200,
    );
    return cookie;
  }

  it('previews who a reminder reaches and who is left out, then reminds everyone with a note', async () => {
    const w = await plannedWedding();
    await answerHaldi(w.rajesh.url);
    const nehaCookie = await asGuest(w.neha.url);
    expect(
      (
        await ok<{ reminderEmails: string }>(
          send('get', nehaCookie, '/guest-access/invitation'),
          200,
        )
      ).reminderEmails,
    ).toBe('on');
    expect(await ok(send('post', nehaCookie, '/guest-access/reminders/opt-out'), 200)).toEqual({
      reminderEmails: 'off',
    });

    const preview = await ok<PreviewBody>(
      send('post', w.owner.cookie, `${w.guests}/reminders/preview`, {}),
      200,
    );
    expect(preview.recipients).toBe(2);
    expect(preview.emailsLeftToday).toBe(300);
    expect(preview.skipped).toEqual({
      noEmail: { count: 1, names: ['Kavya Iyer'] },
      notShared: { count: 1, names: ['Suresh Yadav'] },
      linkOff: { count: 1, names: ['Vikram Singh'] },
      remindersOff: { count: 1, names: ['Neha Jha'] },
    });

    const sent = await ok<{ queued: number }>(
      send('post', w.owner.cookie, `${w.guests}/reminders`, {
        note: '  Please reply by 25 January.\nThank you!  ',
      }),
      202,
    );
    expect(sent.queued).toBe(2);
    const toRajesh = await waitFor(
      () =>
        worker.mail.sent.find((mail) => mail.to === w.mail('rajesh') && /RSVP/.test(mail.subject)),
      { what: 'Rajesh’s reminder' },
    );
    expect(toRajesh.subject).toMatch(/^Please RSVP: Ananya .* & Arjun’s wedding$/);
    expect(toRajesh.text).toContain('Please reply by 25 January.\nThank you!');
    expect(toRajesh.text).toContain('✓ Your answer: Attending · 4 of 5 people');
    expect(toRajesh.text).toContain('● Not answered yet');
    expect(toRajesh.text).toContain(`RSVP now: ${w.rajesh.url}`);
    expect(toRajesh.text).toContain(`${w.rajesh.url}&reminders`);
    expect(toRajesh.html).toContain('A NOTE FROM');
    const toPriya = await waitFor(
      () => worker.mail.sent.find((mail) => mail.to === w.mail('priya')),
      { what: 'Priya’s reminder' },
    );
    expect(toPriya.text).toContain('Wedding');
    expect(toPriya.text).not.toContain('Haldi');
    expect(worker.mail.sent.some((mail) => mail.to === w.mail('neha'))).toBe(false);

    await waitFor(
      async () => {
        const { guest } = await ok<{
          guest: { lastReminder?: { state: string }; remindersOff: boolean };
        }>(send('get', w.owner.cookie, `${w.guests}/${w.rajesh.id}`), 200);
        return guest.lastReminder?.state === 'sent';
      },
      { what: 'the reminder to show as sent' },
    );
    const { guest: neha } = await ok<{ guest: { remindersOff: boolean } }>(
      send('get', w.owner.cookie, `${w.guests}/${w.neha.id}`),
      200,
    );
    expect(neha.remindersOff).toBe(true);

    // About one ceremony only: Priya is not invited to Haldi.
    const haldiOnly = await ok<PreviewBody>(
      send('post', w.owner.cookie, `${w.guests}/reminders/preview`, { eventId: w.haldi }),
      200,
    );
    expect(haldiOnly.recipients).toBe(1);
    expect(haldiOnly.emailsLeftToday).toBe(298);
  });

  it('reminds one guest, or says why not', { timeout: 20_000 }, async () => {
    const w = await plannedWedding();
    const remind = (guestId: string, body: object = {}) =>
      send('post', w.owner.cookie, `${w.guests}/${guestId}/reminder`, body);
    const code = async (res: request.Test) => {
      const done = await res;
      return [done.status, (done.body as { error: { code: string } }).error.code];
    };
    expect(await code(remind(w.suresh.id))).toEqual([409, 'INVITATION_NOT_SHARED']);
    expect(await code(remind(w.vikram.id))).toEqual([409, 'INVITATION_LINK_OFF']);
    expect(await code(remind(w.kavya.id))).toEqual([400, 'VALIDATION_ERROR']);
    expect(await code(remind(w.priya.id, { eventId: w.haldi }))).toEqual([400, 'VALIDATION_ERROR']);
    expect(await code(remind(w.priya.id, { note: 'x'.repeat(501) }))).toEqual([
      400,
      'VALIDATION_ERROR',
    ]);

    // No limit per guest: twice in a row is two emails.
    expect(
      await ok<{ queued: number }>(remind(w.priya.id, { eventId: w.wedding }), 202),
    ).toMatchObject({ queued: 1 });
    expect(await ok<{ queued: number }>(remind(w.priya.id), 202)).toMatchObject({ queued: 1 });
    await waitFor(
      () => worker.mail.sent.filter((mail) => mail.to === w.mail('priya')).length === 2,
      { what: 'both reminders' },
    );

    // Another wedding's organizer sees nothing.
    const stranger = await signupVerified(app, { displayName: 'Someone Else' });
    expect((await remind(w.priya.id).set('Cookie', stranger.cookie)).status).toBe(404);
    expect((await send('post', stranger.cookie, `${w.guests}/reminders`, {})).status).toBe(404);

    // Archived: read-only.
    await weddings.updateOne(
      { _id: new Types.ObjectId(w.weddingId) },
      { $set: { status: 'archived' } },
    );
    expect(await code(remind(w.priya.id))).toEqual([409, 'WEDDING_ARCHIVED']);
  });

  it('refuses a reminder that would pass the daily email budget, saying how many are left', async () => {
    const w = await plannedWedding();
    await app.get(RateLimiter).hit(GUEST_RATE_LIMITS.inviteEmailsPerWedding, w.weddingId, 299);
    const res = await send('post', w.owner.cookie, `${w.guests}/reminders`, {});
    expect(res.status).toBe(429);
    expect((res.body as { error: { code: string; message: string } }).error).toMatchObject({
      code: 'EMAIL_DAILY_LIMIT',
      message: expect.stringContaining('1 more email today') as string,
    });
    expect(await reminders.countDocuments({ weddingId: new Types.ObjectId(w.weddingId) })).toBe(0);
    // One still fits.
    await ok(send('post', w.owner.cookie, `${w.guests}/${w.priya.id}/reminder`, {}), 202);
  });

  it('keeps automatic reminders off until switched on, and checks the days asked for', async () => {
    const w = await plannedWedding();
    const path = `/weddings/${w.weddingId}/reminder-settings`;
    expect(await ok(send('get', w.owner.cookie, path), 200)).toEqual({
      remindersEnabled: false,
      reminderOffsetsDays: [30, 7, 3],
      sendTime: '09:00',
    });
    expect(
      (
        await send('put', w.owner.cookie, path, {
          remindersEnabled: true,
          reminderOffsetsDays: [5],
        })
      ).status,
    ).toBe(400);
    expect(
      (await send('put', w.owner.cookie, path, { remindersEnabled: true, reminderOffsetsDays: [] }))
        .status,
    ).toBe(400);
    expect(
      await ok(
        send('put', w.owner.cookie, path, {
          remindersEnabled: true,
          reminderOffsetsDays: [3, 7, 7],
        }),
        200,
      ),
    ).toEqual({ remindersEnabled: true, reminderOffsetsDays: [7, 3], sendTime: '09:00' });
  });

  it('sends each automatic reminder once, on its day, and again only for a new date', async () => {
    const w = await plannedWedding();
    const at = (hour: number) =>
      new Date(`${today()}T${String(hour).padStart(2, '0')}:00:00+05:30`);
    const mine = () =>
      reminders.find({ weddingId: new Types.ObjectId(w.weddingId), source: 'automatic' }).lean();

    // Off: nothing, even on the day.
    await service.sendDueReminders(at(10));
    expect(await mine()).toHaveLength(0);

    await ok(
      send('put', w.owner.cookie, `/weddings/${w.weddingId}/reminder-settings`, {
        remindersEnabled: true,
        reminderOffsetsDays: [30, 7, 3],
      }),
      200,
    );
    // Before 9 am where the ceremony is held: not yet.
    await service.sendDueReminders(at(8));
    expect(await mine()).toHaveLength(0);

    // Haldi is 7 days away: Rajesh is reminded (Priya is not invited to Haldi;
    // Neha would be, but the others cannot be reminded).
    await service.sendDueReminders(at(10));
    await service.sendDueReminders(at(11));
    const first = await mine();
    expect(first).toHaveLength(2); // Rajesh and Neha
    expect(first.every((reminder) => reminder.offsetDays === 7)).toBe(true);
    const toRajesh = await waitFor(
      () => worker.mail.sent.find((mail) => mail.to === w.mail('rajesh')),
      { what: 'the automatic reminder' },
    );
    expect(toRajesh.subject).toMatch(/^Haldi is in 7 days · Ananya .* & Arjun’s wedding$/);
    expect(toRajesh.html).toContain('7 DAYS TO GO');

    // Neha turns reminders off.
    const nehaCookie = await asGuest(w.neha.url);
    await ok(send('post', nehaCookie, '/guest-access/reminders/opt-out'), 200);

    // A changed time is a new schedule: Haldi is still 7 days away, so
    // Rajesh is reminded again; Neha is not.
    await ok(
      send('patch', w.owner.cookie, `/weddings/${w.weddingId}/events/${w.haldi}`, {
        startTime: '11:00',
      }),
      200,
    );
    await service.sendDueReminders(at(12));
    const after = await mine();
    expect(after).toHaveLength(3);
    expect(after.filter((reminder) => String(reminder.guestId) === w.rajesh.id)).toHaveLength(2);

    // Archived: no reminders at all, even for a new schedule.
    await weddings.updateOne(
      { _id: new Types.ObjectId(w.weddingId) },
      { $set: { status: 'archived' } },
    );
    await events.updateOne({ _id: new Types.ObjectId(w.haldi) }, { $inc: { scheduleVersion: 1 } });
    expect((await service.sendDueReminders(at(13))).queued).toBe(0);
    await weddings.updateOne(
      { _id: new Types.ObjectId(w.weddingId) },
      { $set: { status: 'active' } },
    );
    expect((await service.sendDueReminders(at(13))).queued).toBe(1);
  });
});

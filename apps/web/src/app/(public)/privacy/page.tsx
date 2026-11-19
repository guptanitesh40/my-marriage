import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/legal-document';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How My Marriage collects, uses and protects personal data.',
  // A draft: keep it out of search results until it has been reviewed.
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy policy" lastUpdated="Draft · 18 November 2026">
      <p>
        My Marriage (“we”, “us”) is a wedding planning service operated by [company legal name],
        India. This policy explains what personal data we handle, why, and the choices you have. It
        covers couples and family members who use the planning workspace (“organizers”), guests who
        receive an invitation or upload photos, and visitors to wedding websites.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address, display name and password (stored
          only as a one-way hash), and an optional profile photo.
        </li>
        <li>
          <strong>Wedding details you add:</strong> names, city, ceremony dates and venues,
          schedules, tasks, vendor contacts, expenses, payments and notes.
        </li>
        <li>
          <strong>Guest details added by organizers:</strong> a guest’s name, party size, and
          optionally their email address, phone number and private organizer notes.
        </li>
        <li>
          <strong>Replies from guests:</strong> RSVP choices and the number of people attending each
          ceremony, and requests to stop reminder emails.
        </li>
        <li>
          <strong>Photos:</strong> images uploaded by organizers or guests, with an optional
          uploader name. We remove location data from the versions shown publicly.
        </li>
        <li>
          <strong>Technical data:</strong> a session cookie to keep you signed in, security logs,
          and limited device and network information used to prevent abuse.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the service: planning tools, invitations, RSVPs, websites and galleries.</li>
        <li>
          To send emails you or your organizers ask for: account verification, password resets,
          invitations, ceremony reminders and notifications.
        </li>
        <li>To keep accounts, weddings and links secure, and to prevent misuse.</li>
        <li>To understand, in aggregate, how the service is used so we can improve it.</li>
      </ul>
      <p>
        We do not sell personal data, show advertising on invitations or galleries, or use
        advertising trackers on private invitation pages.
      </p>

      <h2>Who can see what</h2>
      <ul>
        <li>
          <strong>Wedding planning data</strong> is visible only to that wedding’s owners and
          managers. Data from one wedding is never available through another.
        </li>
        <li>
          <strong>Private invitation links</strong> let anyone who has the link view that
          household’s invitation and reply to it. Guests are not asked to prove who they are, so
          please share a link only with the family it is for. Organizers can revoke a link at any
          time.
        </li>
        <li>
          <strong>Published wedding websites</strong> are public: anyone can view the ceremonies,
          venues and schedules on them. Guest lists, replies, expenses and private notes are never
          shown there.
        </li>
        <li>
          <strong>Photos</strong> stay private until an owner or manager approves them. Approved
          photos appear publicly on the wedding website.
        </li>
      </ul>

      <h2>Service providers</h2>
      <p>
        We use trusted providers to run the service, under contracts that limit their use of your
        data: Amazon Web Services (hosting and photo storage), MongoDB Atlas (database) and Google
        (Gmail, for email delivery). We aim to store data in India where these providers allow it
        [to be confirmed with the final hosting region].
      </p>

      <h2>How long we keep data</h2>
      <p>
        We keep wedding data, guest replies and photos for as long as the wedding exists in the
        service, including after it is archived, so you can look back on it. Owners can request that
        a wedding be deleted; deletion removes its records and stored photos, and backups are
        cleared within [backup retention period]. Short-lived data such as sign-in sessions and
        reset links expires automatically.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Update your name, photo, email address and password from your account.</li>
        <li>Ask us for a copy of your data, to correct it, or to delete it.</li>
        <li>As a guest, stop reminder emails from your invitation page at any time.</li>
        <li>Ask a wedding’s organizers, or us, to remove a photo you appear in or uploaded.</li>
      </ul>
      <p>
        To make a request or raise a concern, contact our grievance officer at [contact email]. We
        aim to respond within [response period].
      </p>

      <h2>Children</h2>
      <p>
        Accounts are for people aged 18 or over. Guests of any age may appear in a household’s party
        size, but we do not collect individual details about them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We will update this page when our practices change and tell account holders about
        significant changes by email. See also our <Link href={routes.terms}>terms of use</Link>.
      </p>
    </LegalDocument>
  );
}

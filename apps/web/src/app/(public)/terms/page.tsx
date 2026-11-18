import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/legal-document';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms that apply when you use My Marriage.',
  // A draft: keep it out of search results until it has been reviewed.
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of use" lastUpdated="Draft · 18 November 2026">
      <p>
        These terms apply when you use My Marriage, a wedding planning service operated by [company
        legal name] (“we”, “us”). By creating an account or using the service you agree to them. Our{' '}
        <Link href={routes.privacy}>privacy policy</Link> explains how we handle personal data.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must be 18 or over to create an account.</li>
        <li>
          Keep your password secure. You are responsible for activity on your account, and should
          tell us promptly at [contact email] if you think it has been misused.
        </li>
        <li>You may own one active wedding at a time, and help manage any number of others.</li>
      </ul>

      <h2>The early pilot</h2>
      <p>
        My Marriage is free during our early pilot. Features may change as we learn from couples
        using it. We will give account holders notice before introducing any charges, and paid
        features will never be applied to your account without your agreement.
      </p>

      <h2>Your wedding and its content</h2>
      <ul>
        <li>
          You keep ownership of everything you and your guests add. You give us permission to store,
          process and display it only as needed to provide the service — for example, showing your
          published website and approved photos to visitors.
        </li>
        <li>
          Each wedding has up to two owners with equal control. Owners and managers can invite and
          remove managers, publish the wedding website and approve guests’ photos. Only owners can
          archive or delete the wedding, or change who owns it.
        </li>
        <li>
          Only add guests’ contact details if you have a reasonable basis to use them for your
          wedding, such as sending their invitation.
        </li>
      </ul>

      <h2>Invitation and upload links</h2>
      <p>
        Private invitation links and photo-upload QR codes work for anyone who has them. Share them
        only with the people they are meant for. You can revoke or replace a link at any time, after
        which the old link stops working.
      </p>

      <h2>Photos from guests</h2>
      <p>
        By uploading a photo, a guest confirms they have the right to share it and agrees that, once
        approved by the wedding’s organizers, it may be shown publicly on that wedding’s website.
        Organizers can remove any photo at any time. Each wedding can store up to 5 GB of photos.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not upload content that is unlawful, hateful, sexually explicit or infringing.</li>
        <li>Do not try to access another wedding’s data, or to disrupt or overload the service.</li>
        <li>Do not use the service to send unsolicited messages.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>Archiving and deletion</h2>
      <p>
        An owner can archive a wedding when it is over. Archived weddings become read-only, while a
        published website and approved photos stay available unless an owner unpublishes or removes
        them. Owners can also request that a wedding be permanently deleted.
      </p>

      <h2>Availability and liability</h2>
      <p>
        We work to keep the service reliable, but during the pilot it is provided “as is”, without a
        guarantee of uninterrupted availability. Keep your own copies of anything essential; you can
        export guest lists and photos at any time. To the extent the law allows, we are not liable
        for indirect or consequential losses, and our total liability is limited to [liability cap].
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms and will notify account holders of significant changes by email.
        These terms are governed by the laws of India, and the courts of [city] have jurisdiction.
        Questions? Contact us at [contact email].
      </p>
    </LegalDocument>
  );
}

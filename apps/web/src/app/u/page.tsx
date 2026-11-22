import type { Metadata } from 'next';
import { GuestUpload } from '@/components/upload/guest-upload';

/**
 * A guest's photo upload page, opened from a QR code or link (PRD
 * PHOTO-02, PHOTO-03). Nothing about the wedding goes into the title or
 * metadata, search engines are kept out, and no Referer is sent from it.
 */
export const metadata: Metadata = {
  title: 'Share your photos',
  description: 'Add your photos to a wedding’s collection.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function UploadPage() {
  return <GuestUpload />;
}

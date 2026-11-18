import type { Metadata } from 'next';
import { Celebrations } from '@/components/home/celebrations';
import { Closing } from '@/components/home/closing';
import { GuestExperience } from '@/components/home/guest-experience';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { PlanningFeatures } from '@/components/home/planning-features';
import { Trust } from '@/components/home/trust';
import { WebsiteTemplates } from '@/components/home/website-templates';

const description =
  'Plan every ceremony of your Indian wedding in one place — tasks, vendors, expenses, ceremony-wise RSVPs, a wedding website and guest photos. Free during our early pilot.';

export const metadata: Metadata = {
  title: { absolute: 'My Marriage — Plan your Indian wedding in one place' },
  description,
  openGraph: {
    title: 'My Marriage — Plan your Indian wedding in one place',
    description,
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Celebrations />
      <PlanningFeatures />
      <HowItWorks />
      <WebsiteTemplates />
      <GuestExperience />
      <Trust />
      <Closing />
    </>
  );
}

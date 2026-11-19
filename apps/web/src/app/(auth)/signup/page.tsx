import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard, authLinkClass } from '@/components/auth/auth-card';
import { SignupForm } from '@/components/auth/signup-form';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Plan every ceremony in one place, together with your family."
      footer={
        <>
          Already have an account?{' '}
          <Link href={routes.login} className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}

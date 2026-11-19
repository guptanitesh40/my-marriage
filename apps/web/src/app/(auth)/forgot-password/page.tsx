import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard, authLinkClass } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Forgot your password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter the email you signed up with and we will send you a link to choose a new one."
      footer={
        <>
          Remembered it?{' '}
          <Link href={routes.login} className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

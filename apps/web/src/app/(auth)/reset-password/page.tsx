import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard, authLinkClass } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="Saving it signs you out on every device, so you will sign in again."
      footer={
        <Link href={routes.login} className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard, authLinkClass } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue planning your celebration."
      footer={
        <>
          New to My Marriage?{' '}
          <Link href={routes.signup} className={authLinkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}

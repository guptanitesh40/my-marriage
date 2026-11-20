import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExpensesLoading, ExpensesSection } from '@/components/expenses/server';

export const metadata: Metadata = { title: 'Expenses' };

export default function ExpensesPage({
  params,
  searchParams,
}: PageProps<'/weddings/[weddingId]/expenses'>) {
  return (
    <Suspense fallback={<ExpensesLoading />}>
      <ExpensesSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TasksLoading, TasksSection } from '@/components/tasks/server';

export const metadata: Metadata = { title: 'Tasks' };

export default function TasksPage({
  params,
  searchParams,
}: PageProps<'/weddings/[weddingId]/tasks'>) {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}

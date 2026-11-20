import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Workspace, WorkspaceLoading } from '@/components/workspace/server';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * One wedding's workspace. The wedding comes from the address, and the API
 * decides on every request whether the visitor may see it.
 */
export default function WeddingWorkspaceLayout({
  children,
  params,
}: LayoutProps<'/weddings/[weddingId]'>) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <Workspace params={params}>{children}</Workspace>
    </Suspense>
  );
}

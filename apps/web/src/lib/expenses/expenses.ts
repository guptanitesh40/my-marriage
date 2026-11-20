import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type ExpenseList = components['schemas']['ExpenseListDto'];

export type ExpensesResult = ({ kind: 'ok' } & ExpenseList) | { kind: 'unavailable' };

/**
 * A wedding's expenses with their totals. Reads the request: call it inside
 * <Suspense>. The workspace layout has already answered "not found" for a
 * wedding the visitor does not belong to.
 */
export async function getExpenses(weddingId: string): Promise<ExpensesResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/expenses', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

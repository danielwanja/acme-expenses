// apps/web/src/queries/approvals.ts
import {
  useMutation, useQuery, useQueryClient,
} from "@tanstack/react-query";
import type { PendingQuery } from "@acme/shared";
import {
  approveExpense, bulkApprove, listPending, rejectExpense,
} from "../api";

type PendingFilter = Partial<PendingQuery>;

export const approvalKeys = {
  all: ["approvals"] as const,
  pending: (query: PendingFilter) =>
    [...approvalKeys.all, "pending", query] as const,
};

/** The task-shaped endpoint: only what this user may approve. */
export function usePendingApprovals(query: PendingFilter) {
  return useQuery({
    queryKey: approvalKeys.pending(query),
    queryFn: ({ signal }) => listPending(query, signal),
  });
}

// After any decision the pending list is stale. Returning the promise
// keeps isPending true until the refetch lands.

export function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveExpense,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectExpense(id, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

/** One call for up to MAX_BULK_APPROVE; the result lists each outcome. */
export function useBulkApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkApprove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

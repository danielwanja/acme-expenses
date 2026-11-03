// apps/web/src/queries/approvals.ts
import {
  useMutation, useQuery, useQueryClient,
} from "@tanstack/react-query";
import { approveExpense, rejectExpense } from "../api";
import { listTeamPending } from "../expenses";

export const approvalKeys = {
  all: ["approvals"] as const,
  pending: (uid: string) => [...approvalKeys.all, "pending", uid] as const,
};

export function usePendingApprovals(uid: string) {
  return useQuery({
    queryKey: approvalKeys.pending(uid),
    queryFn: () => listTeamPending(uid),
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

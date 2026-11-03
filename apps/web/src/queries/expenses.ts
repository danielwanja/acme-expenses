// apps/web/src/queries/expenses.ts
import {
  useMutation, useQuery, useQueryClient,
} from "@tanstack/react-query";
import { submitExpense } from "../api";
import { createDraft, listMyExpenses } from "../expenses";

export const expenseKeys = {
  all: ["expenses"] as const,
  mine: (uid: string) => [...expenseKeys.all, "mine", uid] as const,
};

/** A queryFn can be any promise: this one reads Firestore, not HTTP. */
export function useMyExpenses(uid: string) {
  return useQuery({
    queryKey: expenseKeys.mine(uid),
    queryFn: () => listMyExpenses(uid),
  });
}

/** Saves a draft in Firestore; the list refetches so it shows up. */
export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDraft,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

export function useSubmitExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitExpense,
    // Returning the promise keeps isPending true until the refetch lands.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

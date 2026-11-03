// Calls to Acme's own API. Every response is parsed with the shared schema.
import {
  BulkApproveResponse, DecisionResult, PendingPage, SubmitResult, type PendingQuery,
} from "@acme/shared";
import { http } from "./http";

export { ApiCallError } from "./http";

export const submitExpense = (id: string) =>
  http.post(`v1/expenses/${id}/submit`).json(SubmitResult);

export const approveExpense = (id: string) =>
  http.post(`v1/expenses/${id}/approve`).json(DecisionResult);

export const rejectExpense = (id: string, reason: string) =>
  http.post(`v1/expenses/${id}/reject`, { json: { reason } })
    .json(DecisionResult);

export const listPending = (
  query: Partial<PendingQuery> = {}, signal?: AbortSignal,
) => http.get("v1/approvals/pending", { searchParams: query, signal })
  .json(PendingPage);

export const bulkApprove = (expenseIds: string[]) =>
  http.post("v1/expenses/bulk-approve", { json: { expenseIds } })
    .json(BulkApproveResponse);

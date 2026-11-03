// Calls to Acme's own API. Every response is parsed with the shared schema.
import { DecisionResult, SubmitResult } from "@acme/shared";
import { http } from "./http";

export { ApiCallError } from "./http";

export const submitExpense = (id: string) =>
  http.post(`v1/expenses/${id}/submit`).json(SubmitResult);

export const approveExpense = (id: string) =>
  http.post(`v1/expenses/${id}/approve`).json(DecisionResult);

export const rejectExpense = (id: string, reason: string) =>
  http.post(`v1/expenses/${id}/reject`, { json: { reason } })
    .json(DecisionResult);

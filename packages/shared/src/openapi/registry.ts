import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";
import { ApiError } from "../schemas/api-error.js";
import { ApprovalSettings } from "../schemas/approval.js";
import { BulkApproveRequest, BulkApproveResponse } from "../schemas/bulk-approve.js";
import {
  DecisionResult, ExpenseIdParams, RejectRequest, SubmitResult, UpdateExpenseRequest,
} from "../schemas/expense.js";
import { FxRate, FxRateQuery } from "../schemas/fx.js";
import {
  ExpensePage, ExportHeaders, ExportResult, ListExpensesQuery,
} from "../schemas/partner.js";
import { PendingPage, PendingQuery } from "../schemas/pending.js";

export const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "Firebase Auth ID token of a signed-in employee or manager",
});
const partnerKey = registry.registerComponent("securitySchemes", "partnerKey", {
  type: "apiKey",
  in: "header",
  name: "X-Api-Key",
  description: "Partner API key issued by Acme",
});
const asPerson = [{ [bearerAuth.name]: [] }];
const asPartner = [{ [partnerKey.name]: [] }];

const json = (description: string, schema: ZodType) => ({
  description,
  content: { "application/json": { schema } },
});
const error = (description: string) => json(description, ApiError);
const unauthorized = error("Missing or invalid ID token");

registry.registerPath({
  method: "patch",
  path: "/v1/expenses/{id}",
  operationId: "updateExpense",
  summary: "Edit your own draft expense. Only drafts can be edited.",
  security: asPerson,
  request: {
    params: ExpenseIdParams,
    body: { content: { "application/json": { schema: UpdateExpenseRequest } } },
  },
  responses: {
    204: { description: "Draft updated" },
    400: error("Invalid body"),
    401: unauthorized,
    403: error("Not your expense (not_owner)"),
    404: error("No such expense (expense_not_found)"),
    409: error("The expense is not a draft (not_draft)"),
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/expenses/{id}/submit",
  operationId: "submitExpense",
  summary: "Submit your own draft for approval. Converts the amount to USD.",
  security: asPerson,
  request: { params: ExpenseIdParams },
  responses: {
    200: json("Submitted, or approved automatically up to $75, with the USD amount and rate",
      SubmitResult),
    401: unauthorized,
    403: error("Not your expense (not_owner)"),
    404: error("No such expense (expense_not_found)"),
    409: error("The expense is not a draft (not_draft)"),
    422: error("Over $75 in USD and no receipt (receipt_required)"),
    502: error("The rates provider refused our request (fx_unavailable)"),
    503: error("No exchange rate available right now (fx_unavailable). "
      + "The draft is unchanged; retry in a few minutes."),
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/fx/rate",
  operationId: "getFxRate",
  summary: "The USD rate for a currency and day, for previews",
  description: "What submit would use for that day. Convert with the shared "
    + "rule to preview; submit converts again on the server.",
  security: asPerson,
  request: { query: FxRateQuery },
  responses: {
    200: json("USD per one unit of currency, with the provider's date", FxRate),
    400: error("Invalid query (invalid_query)"),
    401: unauthorized,
    502: error("The rates provider refused our request (fx_unavailable)"),
    503: error("No exchange rate available right now (fx_unavailable)"),
  },
});

const decide = (verb: "approve" | "reject") => ({
  security: asPerson,
  responses: {
    200: json(`The expense after you ${verb} it. Over $2,500, a manager's approval `
      + "returns awaiting_finance; Finance's approval returns approved.", DecisionResult),
    400: error("Invalid body"),
    401: unauthorized,
    403: error("Not allowed: cannot_self_approve, not_your_report or not_finance"),
    404: error("No such expense (expense_not_found)"),
    409: error("Nothing for you to decide: not_pending, already_approved_by_you "
      + "or already_approved"),
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/expenses/{id}/approve",
  operationId: "approveExpense",
  summary: "Approve an expense from someone on your team",
  request: { params: ExpenseIdParams },
  ...decide("approve"),
});

registry.registerPath({
  method: "post",
  path: "/v1/expenses/{id}/reject",
  operationId: "rejectExpense",
  summary: "Reject an expense from someone on your team, with a reason",
  request: {
    params: ExpenseIdParams,
    body: { content: { "application/json": { schema: RejectRequest } } },
  },
  ...decide("reject"),
});

registry.register("BulkApproveRequest", BulkApproveRequest);
registry.register("BulkApproveResponse", BulkApproveResponse);

registry.registerPath({
  method: "post",
  path: "/v1/expenses/bulk-approve",
  operationId: "bulkApproveExpenses",
  summary: "Approve up to 20 expenses from your team in one call",
  description: "Each expense goes through the same rule as a single approval. Refused "
    + "ones are skipped with a reason, not fatal. Repeating the call approves nothing twice.",
  security: asPerson,
  request: { body: { content: { "application/json": { schema: BulkApproveRequest } } } },
  responses: {
    200: json("One result per id, in request order. sent_to_finance: approved by you, "
      + "now waiting for Finance.", BulkApproveResponse),
    400: error("Empty, more than 20, or duplicate expenseIds (invalid_body)"),
    401: unauthorized,
    403: error("Only managers can bulk-approve (not_a_manager)"),
  },
});

// ---- Partner API (accounting partners) ----

registry.registerPath({
  method: "get",
  path: "/v1/expenses",
  operationId: "listExpenses",
  summary: "List expenses by status, oldest approval first",
  description: "Only approved and exported expenses are ever listed. Amounts are "
    + "integer minor units. Pages are stable: pass nextCursor back as cursor.",
  security: asPartner,
  request: { query: ListExpensesQuery },
  responses: {
    200: { description: "One page of expenses",
      content: { "application/json": { schema: ExpensePage } } },
    400: { description: "Invalid query (invalid_query, invalid_cursor)",
      content: { "application/json": { schema: ApiError } } },
    401: { description: "Missing or invalid partner key",
      content: { "application/json": { schema: ApiError } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/expenses/{id}/export",
  operationId: "markExpenseExported",
  summary: "Mark one approved expense as exported to your ledger",
  description: "Safe to retry with the same Idempotency-Key: the first response is "
    + "returned again and nothing is exported twice.",
  security: asPartner,
  request: { params: ExpenseIdParams, headers: ExportHeaders },
  responses: {
    200: json("Exported (or the stored response for a repeated key)", ExportResult),
    400: error("Missing or malformed Idempotency-Key (missing_idempotency_key)"),
    401: error("Missing or invalid partner key"),
    404: error("No such expense (expense_not_found)"),
    409: error("The expense is not approved (not_approved)"),
    422: error("This key was already used for a different expense "
      + "(idempotency_key_reused)"),
  },
});

// ---- For managers and their agents ----

registry.registerPath({
  method: "get",
  path: "/v1/approvals/pending",
  operationId: "listPendingApprovals",
  summary: "Expenses waiting for the signed-in manager's approval, oldest first",
  description: "Read-only. Returns only expenses this caller may approve. "
    + "view=summary (default) is five fields per item; view=full adds detail.",
  security: asPerson,
  request: { query: PendingQuery },
  responses: {
    200: json("One page of pending approvals", PendingPage),
    400: error("Invalid query (invalid_query) or stale cursor (cursor_invalid: "
      + "call again without cursor)"),
    401: unauthorized,
  },
});

// ---- Admin ----

registry.registerPath({
  method: "put",
  path: "/v1/settings/approval",
  operationId: "updateApprovalSettings",
  summary: "Change the Finance threshold or the Finance-step flag (admins only)",
  description: "Every change is recorded with who made it and when.",
  security: asPerson,
  request: { body: { content: { "application/json": { schema: ApprovalSettings } } } },
  responses: {
    200: json("The settings now in force", ApprovalSettings),
    400: error("Invalid settings (invalid_body)"),
    401: unauthorized,
    403: error("Not an admin (not_an_admin)"),
  },
});

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";
import { ApiError } from "../schemas/api-error.js";
import {
  DecisionResult, ExpenseIdParams, RejectRequest, SubmitResult, UpdateExpenseRequest,
} from "../schemas/expense.js";

export const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "Firebase Auth ID token of a signed-in employee or manager",
});
const asPerson = [{ [bearerAuth.name]: [] }];

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
    200: json("Submitted, with the USD amount and the rate used", SubmitResult),
    401: unauthorized,
    403: error("Not your expense (not_owner)"),
    404: error("No such expense (expense_not_found)"),
    409: error("The expense is not a draft (not_draft)"),
    422: error("Can't be submitted as it is: receipt_required (over $75 in USD "
      + "and no receipt) or unsupported_currency"),
  },
});

const decide = (verb: "approve" | "reject") => ({
  security: asPerson,
  responses: {
    200: json(`The expense after you ${verb} it`, DecisionResult),
    400: error("Invalid body"),
    401: unauthorized,
    403: error("Not allowed: cannot_self_approve or not_your_report"),
    404: error("No such expense (expense_not_found)"),
    409: error("Not waiting for approval (not_pending)"),
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

import {
  canEdit, convertToUsd, DecisionResult, isReceiptRequired, ExpenseIdParams, RejectRequest,
  SubmitResult, UpdateExpenseRequest, type Expense,
} from "@acme/shared";
import { Router, type Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { requireAuth, requireFreshAuth, userOf } from "../middleware/auth.js";
import { approveOne, expenseNotFound, rejectOne } from "../services/approvals.js";

// People's routes (employees and managers). Mounted at /api by app.ts.
// requireAuth goes on each route, not expenses.use(): partner routes share the mount.
export const expenses = Router();

function parse<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new HttpError(400, `invalid_${what}`, z.prettifyError(r.error));
  return r.data;
}

/** Loads the caller's own draft, or throws the documented error. */
async function ownDraft(req: Request, user: DecodedIdToken) {
  const { id } = parse(ExpenseIdParams, req.params, "params");
  const ref = getFirestore().doc(`expenses/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw expenseNotFound(id);
  const expense = snap.data() as Expense;
  if (expense.ownerId !== user.uid) {
    throw new HttpError(403, "not_owner", "You can only change your own expenses.");
  }
  if (!canEdit(expense)) {
    throw new HttpError(409, "not_draft", `Expense ${id} is ${expense.status}.`,
      "Only drafts can be edited or submitted.");
  }
  return { id, ref, expense };
}

expenses.patch("/v1/expenses/:id", requireAuth, async (req, res) => {
  const changes = parse(UpdateExpenseRequest, req.body, "body");
  const { ref } = await ownDraft(req, userOf(req));
  await ref.update(changes);
  res.status(204).end();
});

expenses.post("/v1/expenses/:id/submit", requireAuth, async (req, res) => {
  const { id, ref, expense } = await ownDraft(req, userOf(req));
  if (expense.currency !== "USD") {
    throw new HttpError(422, "unsupported_currency",
      "Only USD expenses can be submitted for now.",
      "Foreign currencies arrive with the exchange-rate client.");
  }
  const fxRate = 1;
  const fxRateDate = new Date().toISOString().slice(0, 10);
  const amountBase = convertToUsd(expense, fxRate).amount; // shared rule
  if (isReceiptRequired(amountBase) && !expense.receiptPath) {
    throw new HttpError(422, "receipt_required",
      "Expenses over $75 need a receipt before they can be submitted.",
      "Attach a receipt image to the draft, then submit again.");
  }
  await ref.update({
    status: "submitted",
    amountBase,
    baseCurrency: "USD",
    fxRate,
    fxRateDate,
    submittedAt: FieldValue.serverTimestamp(),
  });
  res.json(SubmitResult.parse({
    expenseId: id, status: "submitted", amountBase, baseCurrency: "USD", fxRate, fxRateDate,
  }));
});

expenses.post("/v1/expenses/:id/approve", requireFreshAuth, async (req, res) => {
  const { id } = parse(ExpenseIdParams, req.params, "params");
  await approveOne(userOf(req), id);
  res.json(DecisionResult.parse({ expenseId: id, status: "approved" }));
});

expenses.post("/v1/expenses/:id/reject", requireFreshAuth, async (req, res) => {
  const { id } = parse(ExpenseIdParams, req.params, "params");
  const { reason } = parse(RejectRequest, req.body, "body");
  await rejectOne(userOf(req), id, reason);
  res.json(DecisionResult.parse({ expenseId: id, status: "rejected" }));
});

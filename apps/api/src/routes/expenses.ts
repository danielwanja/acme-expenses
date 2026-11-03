import {
  BulkApproveRequest, BulkApproveResponse,
  canEdit, convertToUsd, DecisionResult, isAutoApproved, isReceiptRequired, isSpotChecked,
  ExpenseIdParams, RejectRequest, SubmitResult, UpdateExpenseRequest, type Expense,
} from "@acme/shared";
import { Router, type Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { requireAuth, requireFreshAuth, userOf } from "../middleware/auth.js";
import {
  approveOne, bulkApprove, expenseNotFound, loadApprover, rejectOne,
} from "../services/approvals.js";
import { FxError } from "../services/fx-client.js";
import { ratesFor } from "../services/fx-rates.js";

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

// Where spot checks get their random number. Tests pass their own.
let random: () => number = Math.random;
export function configureSpotCheck(source: () => number = Math.random): void {
  random = source;
}

expenses.post("/v1/expenses/:id/submit", requireAuth, async (req, res) => {
  const { id, ref, expense } = await ownDraft(req, userOf(req));
  const today = new Date().toISOString().slice(0, 10);
  let fxRate = 1; // USD expenses skip conversion
  let fxRateDate = today;
  if (expense.currency !== "USD") {
    const fx = await ratesFor(today, expense.currency); // Firestore cache
    const rate = fx.rates["USD"];
    if (rate === undefined) {
      throw new FxError("bad_response", `no USD rate for ${fx.base}`);
    }
    fxRate = rate;
    fxRateDate = fx.date; // the provider's date, not the one we asked for
  }
  const amountBase = convertToUsd(expense, fxRate).amount; // shared rule
  if (isReceiptRequired(amountBase) && !expense.receiptPath) {
    throw new HttpError(422, "receipt_required",
      "Expenses over $75 need a receipt before they can be submitted.",
      "Attach a receipt image to the draft, then submit again.");
  }
  // Up to $75 needs no manager: approved now, and about 1 in 20 is sampled for review.
  const auto = isAutoApproved(amountBase);
  const status = auto ? "approved" : "submitted";
  await ref.update({
    status,
    amountBase,
    baseCurrency: "USD",
    fxRate,
    fxRateDate,
    submittedAt: FieldValue.serverTimestamp(),
    ...(auto ? {
      approvedBy: "auto",
      approvedAt: FieldValue.serverTimestamp(),
      spotCheck: isSpotChecked(random()),
    } : {}),
  });
  res.json(SubmitResult.parse({
    expenseId: id, status, ...(auto ? { approvedBy: "auto" } : {}),
    amountBase, baseCurrency: "USD", fxRate, fxRateDate,
  }));
});

expenses.post("/v1/expenses/bulk-approve", requireFreshAuth, async (req, res) => {
  const user = userOf(req);
  if (user["role"] !== "manager") {
    throw new HttpError(403, "not_a_manager", "Only managers can bulk-approve.");
  }
  const { expenseIds } = parse(BulkApproveRequest, req.body, "body");
  const approver = await loadApprover(undefined, user);
  const results = await bulkApprove(approver, expenseIds);
  res.json(BulkApproveResponse.parse({ results }));
});

expenses.post("/v1/expenses/:id/approve", requireFreshAuth, async (req, res) => {
  const { id } = parse(ExpenseIdParams, req.params, "params");
  const decision = await approveOne(userOf(req), id);
  res.json(DecisionResult.parse({ expenseId: id, status: decision.nextStatus }));
});

expenses.post("/v1/expenses/:id/reject", requireFreshAuth, async (req, res) => {
  const { id } = parse(ExpenseIdParams, req.params, "params");
  const { reason } = parse(RejectRequest, req.body, "body");
  await rejectOne(userOf(req), id, reason);
  res.json(DecisionResult.parse({ expenseId: id, status: "rejected" }));
});

// apps/api/src/services/export.ts
import type { ExportResult } from "@acme/shared";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpError } from "../errors.js";

export type ExportInput = { partnerId: string; key: string; expenseId: string };

/** Idempotent: a repeated key returns the stored response and changes nothing. */
export async function markExported(p: ExportInput): Promise<ExportResult> {
  const db = getFirestore();
  const keyRef = db.doc(`idempotency/${p.partnerId}_${p.key}`);
  const expRef = db.doc(`expenses/${p.expenseId}`);
  return db.runTransaction(async (tx) => {
    const seen = await tx.get(keyRef);
    if (seen.exists) {
      if (seen.get("expenseId") !== p.expenseId) {
        throw new HttpError(422, "idempotency_key_reused",
          "This key was already used for a different expense.",
          "Generate a new key for each expense you export.");
      }
      return seen.get("response") as ExportResult;
    }
    const exp = await tx.get(expRef);
    if (!exp.exists) throw new HttpError(404, "expense_not_found",
      `No expense with id ${p.expenseId}.`);
    if (exp.get("status") !== "approved") {
      throw new HttpError(409, "not_approved",
        `Expense ${p.expenseId} is ${exp.get("status")}.`,
        "Only approved expenses can be exported.");
    }
    const response: ExportResult = { expenseId: p.expenseId, status: "exported" };
    tx.update(expRef, {
      status: "exported", exportedBy: p.partnerId, exportedAt: FieldValue.serverTimestamp(),
    });
    tx.set(keyRef, {
      expenseId: p.expenseId, response, createdAt: FieldValue.serverTimestamp(),
    });
    return response;
  });
}

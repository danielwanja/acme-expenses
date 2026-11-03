import {
  ExpensePage, PartnerExpense, type Expense, type ListExpensesQuery,
} from "@acme/shared";
import {
  FieldPath, getFirestore, Timestamp, type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { HttpError } from "../errors.js";
import { employeeNames } from "./approvals.js";

// The cursor is opaque to partners: the last item's approval time and id.
type Cursor = { s: number; n: number; id: string };

const encode = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString("base64url");

function decode(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof c.s === "number" && typeof c.n === "number" && typeof c.id === "string") {
      return { s: c.s, n: c.n, id: c.id };
    }
  } catch { /* fall through */ }
  throw new HttpError(400, "invalid_cursor", "This cursor is not one we issued.",
    "Pass nextCursor back exactly as you received it, or omit it.");
}

function toPartner(doc: QueryDocumentSnapshot, names: Map<string, string>): PartnerExpense {
  const e = doc.data() as Expense & { approvedAt: Timestamp };
  return PartnerExpense.parse({
    id: doc.id,
    employeeId: e.ownerId,
    employeeName: names.get(e.ownerId) ?? e.ownerId,
    category: e.category,
    spentOn: e.spentOn,
    original: { amount: e.amount, currency: e.currency },
    converted: { amount: e.amountBase, currency: "USD" },
    status: e.status,
    approvedAt: e.approvedAt.toDate().toISOString(),
  });
}

/** Stable order (approval time, then document id), so syncs never skip or repeat. */
export async function listExpenses(q: ListExpensesQuery): Promise<ExpensePage> {
  let query = getFirestore().collection("expenses")
    .where("status", "==", q.status)
    .orderBy("approvedAt")
    .orderBy(FieldPath.documentId())
    .limit(q.limit + 1);
  if (q.cursor) {
    const c = decode(q.cursor);
    query = query.startAfter(new Timestamp(c.s, c.n), c.id);
  }
  const snap = await query.get();
  const docs = snap.docs.slice(0, q.limit);
  const names = await employeeNames(docs.map((d) => String(d.get("ownerId"))));
  const last = docs.at(-1);
  const more = snap.docs.length > q.limit && last;
  const at = last?.get("approvedAt") as Timestamp | undefined;
  return ExpensePage.parse({
    items: docs.map((d) => toPartner(d, names)),
    nextCursor: more && at ? encode({ s: at.seconds, n: at.nanoseconds, id: last.id }) : null,
  });
}

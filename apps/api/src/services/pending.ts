import {
  checkApproval, formatMoney, PendingPage, type Approver, type Expense,
  type PendingItem, type PendingQuery,
} from "@acme/shared";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Timestamp } from "firebase-admin/firestore";
import { HttpError } from "../errors.js";
import { reportsOf } from "./approvals.js";

type Stored = Expense & { submittedAt?: Timestamp };
type Candidate = { id: string; expense: Stored };
const DAY_MS = 86_400_000;

// The cursor is an offset into the caller's own pending list.
const encodeCursor = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");

function decodeCursor(raw: string, total: number): number {
  const m = /^o:(\d+)$/.exec(Buffer.from(raw, "base64url").toString("utf8"));
  const offset = m ? Number(m[1]) : NaN;
  if (!Number.isSafeInteger(offset) || offset > total) {
    throw new HttpError(400, "cursor_invalid", "This cursor is stale or malformed.",
      "Call again without cursor to start from the oldest pending expense.");
  }
  return offset;
}

/** Submitted expenses from the approver's reports (Firestore "in" takes 30 values). */
async function candidatesFor(approver: Approver): Promise<Candidate[]> {
  const db = getFirestore();
  const out: Candidate[] = [];
  for (let i = 0; i < approver.team.length; i += 30) {
    const snap = await db.collection("expenses")
      .where("ownerId", "in", approver.team.slice(i, i + 30))
      .where("status", "==", "submitted")
      .get();
    out.push(...snap.docs.map((d) => ({ id: d.id, expense: d.data() as Stored })));
  }
  return out;
}

function toItem(
  { id, expense: e }: Candidate, name: string, view: PendingQuery["view"], now: number,
): PendingItem {
  const submitted = e.submittedAt?.toDate();
  const converted = e.amountBase === undefined
    ? undefined : { amount: e.amountBase, currency: "USD" };
  const item: PendingItem = {
    expenseId: id,
    employeeName: name,
    amountDisplay: formatMoney(converted ?? e),
    category: e.category,
    ageDays: submitted ? Math.max(0, Math.floor((now - submitted.getTime()) / DAY_MS)) : 0,
  };
  if (view === "summary") return item;
  return {
    ...item,
    status: e.status,
    spentOn: e.spentOn,
    submittedAt: submitted?.toISOString(),
    original: { amount: e.amount, currency: e.currency },
    converted,
    note: e.note,
  };
}

/** Only what this caller may approve: the shared rule decides, per expense. */
export async function listPending(user: DecodedIdToken, q: PendingQuery): Promise<PendingPage> {
  const reports = await reportsOf(user.uid);
  const approver: Approver = { uid: user.uid, team: reports.docs.map((d) => d.id) };
  const names = new Map(reports.docs.map((d) => [d.id, String(d.get("displayName") ?? d.id)]));
  const pending = (await candidatesFor(approver))
    .filter((c) => checkApproval(approver, c.expense).ok)
    .sort((a, b) => (a.expense.submittedAt?.toMillis() ?? 0)
      - (b.expense.submittedAt?.toMillis() ?? 0) || a.id.localeCompare(b.id));
  const offset = q.cursor ? decodeCursor(q.cursor, pending.length) : 0;
  const end = offset + q.limit;
  const now = Date.now();
  return PendingPage.parse({
    items: pending.slice(offset, end).map((c) =>
      toItem(c, names.get(c.expense.ownerId) ?? c.expense.ownerId, q.view, now)),
    nextCursor: end < pending.length ? encodeCursor(end) : null,
    totalPending: pending.length,
  });
}

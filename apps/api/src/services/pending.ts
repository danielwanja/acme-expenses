import {
  checkApproval, formatMoney, PENDING, PendingPage, type Approver, type Expense,
  type PendingItem, type PendingQuery,
} from "@acme/shared";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  getFirestore, type QueryDocumentSnapshot, type Timestamp,
} from "firebase-admin/firestore";
import { HttpError } from "../errors.js";
import {
  employeeNames, loadApprovals, loadApprover, loadSettings,
} from "./approvals.js";

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

/**
 * Candidates: pending expenses from the approver's reports (Firestore "in"
 * takes 30 values) and, for Finance, everything awaiting Finance.
 * The shared rule then decides which of them this approver may approve.
 */
async function candidatesFor(approver: Approver): Promise<Candidate[]> {
  const db = getFirestore();
  const byId = new Map<string, Candidate>();
  const add = (docs: QueryDocumentSnapshot[]) => {
    for (const d of docs) byId.set(d.id, { id: d.id, expense: d.data() as Stored });
  };
  for (let i = 0; i < approver.team.length; i += 30) {
    const snap = await db.collection("expenses")
      .where("ownerId", "in", approver.team.slice(i, i + 30)).get();
    add(snap.docs.filter((d) => PENDING.includes(d.get("status"))));
  }
  if (approver.isFinance) {
    add((await db.collection("expenses").where("status", "==", "awaiting_finance").get()).docs);
  }
  return [...byId.values()];
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
  const approver = await loadApprover(undefined, user);
  const settings = await loadSettings();
  const db = getFirestore();
  const allowed: Candidate[] = [];
  for (const c of await candidatesFor(approver)) {
    const approvals = await loadApprovals(db.doc(`expenses/${c.id}`));
    if (checkApproval({ approver, expense: c.expense, approvals, settings }).ok) allowed.push(c);
  }
  const owners = allowed.map((c) => c.expense.ownerId);
  const names = await employeeNames(owners);
  const pending = allowed
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

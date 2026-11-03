// Direct Firestore access from the browser. firestore.rules decides what's allowed:
// owners create drafts and read their own expenses; everything else goes via the API.
import { Expense, NewExpense } from "@acme/shared";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export type ExpenseRow = Expense & { id: string };
export type PendingRow = ExpenseRow & { employeeName: string };

export async function createDraft(draft: NewExpense): Promise<string> {
  const ref = await addDoc(collection(db, "expenses"), NewExpense.parse(draft));
  return ref.id;
}

export async function listMyExpenses(uid: string): Promise<ExpenseRow[]> {
  const snap = await getDocs(
    query(collection(db, "expenses"), where("ownerId", "==", uid)));
  return snap.docs
    .map((d) => ({ id: d.id, ...Expense.parse(d.data()) }))
    .sort((a, b) => b.spentOn.localeCompare(a.spentOn) || a.id.localeCompare(b.id));
}

/** Expenses from the signed-in manager's reports that wait for approval. */
export async function listTeamPending(uid: string): Promise<PendingRow[]> {
  const team = await getDocs(query(collection(db, "users"), where("managerId", "==", uid)));
  if (team.empty) return [];
  const names = new Map(team.docs.map((d) => [d.id, String(d.get("displayName") ?? d.id)]));
  const snap = await getDocs(query(collection(db, "expenses"),
    where("ownerId", "in", [...names.keys()].slice(0, 30)),
    where("status", "==", "submitted")));
  return snap.docs.map((d) => {
    const e = d.data() as Expense;
    return { ...e, id: d.id, employeeName: names.get(e.ownerId) ?? e.ownerId };
  });
}

// Direct Firestore access from the browser. firestore.rules decides what's allowed:
// owners create drafts and read their own expenses; everything else goes via the API.
import {
  Expense, NewExpense, readApprovalSettings, type ApprovalSettings,
} from "@acme/shared";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export type ExpenseRow = Expense & { id: string };

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

/** settings/approval, read so the UI can explain the rule (fails closed, like the API). */
export async function loadApprovalSettings(): Promise<ApprovalSettings> {
  const snap = await getDoc(doc(db, "settings/approval"));
  return readApprovalSettings(snap.data());
}

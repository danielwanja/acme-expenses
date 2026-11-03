import type { Status } from "@acme/shared";

/** One call to the legacy app, and the user it runs as. */
export type LegacyRequest = { endpoint: "expense.php"; id: number; as: string };

/** A row as expense.php returns it: amounts are number_format() strings. */
export type LegacyExpense = {
  id: number;
  amount: string; // "1,234.50"
  currency: string;
  status: string; // "0".."4", see normalize.ts
  expense_date: string; // "2026-03-01 00:00:00", server local time
};

/** The fields both apps must agree on. */
export type ExpenseView = {
  id: string;
  amount: number; // integer cents
  currency: string;
  status: Status;
  date: string; // YYYY-MM-DD
};

export type ParityCase = { name: string; request: LegacyRequest; recorded: LegacyExpense };

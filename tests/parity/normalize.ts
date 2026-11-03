// tests/parity/normalize.ts
import { legacyAmountToCents } from "../../migration/legacy-money";
import type { ExpenseView, LegacyExpense } from "./types";

const STATUS = [
  "draft", "submitted", "approved", "rejected", "exported",
] as const;

export function fromLegacy(row: LegacyExpense): ExpenseView {
  return {
    id: `legacy-${row.id}`,
    amount: legacyAmountToCents(row.amount), // "129.99" -> 12999
    currency: row.currency,
    status: STATUS[Number(row.status)],
    date: row.expense_date.slice(0, 10), // keep the calendar date
  };
}

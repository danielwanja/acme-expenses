import { z } from "../zod.js";

export const STATUSES = [
  "draft", "submitted", "awaiting_finance", "approved", "rejected", "exported",
] as const;
export const Status = z.enum(STATUSES).openapi("Status");
export type Status = z.infer<typeof Status>;

export const CATEGORIES = ["Meals", "Travel", "Lodging", "Supplies", "Other"] as const;
export const Category = z.enum(CATEGORIES).openapi("Category");
export type Category = z.infer<typeof Category>;

export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/)
  .openapi({ description: "ISO 4217 code", example: "EUR" });

/** Integer minor units (cents for USD, yen for JPY). Never a float. */
export const MinorUnits = z.number().int().nonnegative();

export const CalendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .openapi({ example: "2026-10-14" });

/** A new draft, exactly as the web app writes it to Firestore (see firestore.rules). */
export const NewExpense = z.object({
  ownerId: z.string().min(1),
  amount: MinorUnits,
  currency: CurrencyCode,
  category: Category,
  spentOn: CalendarDate,
  note: z.string().max(500),
  receiptPath: z.string().min(1).nullable(),
  status: z.literal("draft"),
});
export type NewExpense = z.infer<typeof NewExpense>;

/** The stored document. The server adds the conversion fields at submission. */
export const Expense = NewExpense.extend({
  status: Status,
  amountBase: MinorUnits.optional(), // USD cents, set at submission
  baseCurrency: z.literal("USD").optional(),
  fxRate: z.number().positive().optional(), // USD per one unit of currency
  fxRateDate: CalendarDate.optional(), // the provider's date for the rate
  approvedBy: z.string().optional(), // "auto" for the up-to-$75 tier
  approvedAt: z.unknown().optional(), // Firestore server timestamp
  spotCheck: z.boolean().optional(), // auto-approved and sampled for review
});
export type Expense = z.infer<typeof Expense>;

export const ExpenseIdParams = z.object({ id: z.string().min(1) });

export const UpdateExpenseRequest = NewExpense
  .pick({
    amount: true, currency: true, category: true,
    spentOn: true, note: true, receiptPath: true,
  })
  .partial()
  .openapi("UpdateExpenseRequest");
export type UpdateExpenseRequest = z.infer<typeof UpdateExpenseRequest>;

export const SubmitResult = z
  .object({
    expenseId: z.string(),
    status: z.enum(["submitted", "approved"]).openapi({
      description: "approved when the expense is approved automatically (up to $75)",
    }),
    approvedBy: z.literal("auto").optional()
      .openapi({ description: "Present when the expense was approved automatically" }),
    amountBase: MinorUnits.openapi({ description: "USD cents" }),
    baseCurrency: z.literal("USD"),
    fxRate: z.number().positive(),
    fxRateDate: CalendarDate,
  })
  .openapi("SubmitResult");
export type SubmitResult = z.infer<typeof SubmitResult>;

export const RejectRequest = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .openapi("RejectRequest");

export const DecisionResult = z
  .object({ expenseId: z.string(), status: Status })
  .openapi("DecisionResult");
export type DecisionResult = z.infer<typeof DecisionResult>;

// packages/shared/src/schemas/partner.ts
import { z } from "../zod.js"; // calls extendZodWithOpenApi(z) once
import { Money } from "./money.js";

export const PartnerExpense = z
  .object({
    id: z.string(),
    employeeId: z.string(),
    employeeName: z.string(),
    category: z.string(),
    spentOn: z.string().openapi({ example: "2026-10-14" }),
    original: Money,
    converted: Money.openapi({ description: "USD at submission" }),
    status: z.enum(["approved", "exported"]),
    approvedAt: z.string().openapi({ description: "ISO 8601 time" }),
  })
  .openapi("Expense"); // the name partners see in openapi.yaml
export type PartnerExpense = z.infer<typeof PartnerExpense>;

export const MAX_PAGE_SIZE = 100;

export const ListExpensesQuery = z.object({
  status: z.enum(["approved", "exported"]).default("approved")
    .openapi({ description: "approved: ready to export. exported: already in a ledger." }),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25)
    .openapi({ description: `Page size, 1-${MAX_PAGE_SIZE}. Default 25.` }),
  cursor: z.string().optional()
    .openapi({ description: "nextCursor from the previous page. Omit for page one." }),
});
export type ListExpensesQuery = z.infer<typeof ListExpensesQuery>;

export const ExpensePage = z
  .object({
    items: z.array(PartnerExpense),
    nextCursor: z.string().nullable()
      .openapi({ description: "Pass back as cursor. null on the last page." }),
  })
  .openapi("ExpensePage");
export type ExpensePage = z.infer<typeof ExpensePage>;

export const ExportHeaders = z.object({
  "idempotency-key": z.string().regex(/^[A-Za-z0-9_-]{8,100}$/).openapi({
    description: "A new random key per expense (8-100 of A-Z a-z 0-9 _ -). "
      + "Retrying with the same key returns the first response and exports nothing twice.",
    example: "5c1f9a2e-export-e1",
  }),
});

export const ExportResult = z
  .object({ expenseId: z.string(), status: z.literal("exported") })
  .openapi("ExportResult");
export type ExportResult = z.infer<typeof ExportResult>;

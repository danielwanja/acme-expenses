// packages/shared/src/schemas/bulk-approve.ts
import { z } from "../zod.js"; // like every schema file (Chapter 8)
import { DenyReason } from "./approval";

export const MAX_BULK_APPROVE = 20;

export const BulkApproveRequest = z.object({
  expenseIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_BULK_APPROVE)
    .refine((ids) => new Set(ids).size === ids.length,
      "expenseIds must be unique"),
});

export const BulkApproveResult = z.object({
  expenseId: z.string(),
  outcome: z.enum(["approved", "skipped"]),
  reason: DenyReason.optional(),
});
export type BulkApproveResult = z.infer<typeof BulkApproveResult>;

export const BulkApproveResponse = z.object({
  results: z.array(BulkApproveResult),
});

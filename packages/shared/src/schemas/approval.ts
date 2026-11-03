import { z } from "../zod.js";

/** Why an approval is refused. The UI must have copy for every value. */
export const DenyReason = z
  .enum([
    "cannot_self_approve", "not_pending", "not_your_report", "not_found",
    "already_approved_by_you", "already_approved", "not_finance",
  ])
  .openapi("DenyReason");
export type DenyReason = z.infer<typeof DenyReason>;

export const ApprovalStep = z.enum(["manager", "finance"]).openapi("ApprovalStep");
export type ApprovalStep = z.infer<typeof ApprovalStep>;

/**
 * expenses/{id}/approvals/{step}: the audit trail. Server-only and append-only.
 * Each record snapshots the amount and threshold in force at the time.
 */
export const ApprovalRecord = z.object({
  step: ApprovalStep,
  approverId: z.string(),
  decidedAt: z.unknown(), // Firestore server timestamp
  amountBase: z.number().int().nonnegative().nullable().optional(), // absent if backfilled
  financeThresholdBase: z.number().int().nonnegative().optional(),
  via: z.enum(["single", "bulk", "backfill"]),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecord>;

/**
 * settings/approval. Config, not code: Finance can change the threshold.
 * Validated on every read; see readApprovalSettings() for the fail-closed rule.
 */
export const ApprovalSettings = z
  .object({
    financeThresholdBase: z.number().int().positive()
      .openapi({ description: "Over this many USD cents, Finance approves second" }),
    financeStep: z.boolean()
      .openapi({ description: "Rollout flag for the Finance step" }),
  })
  .openapi("ApprovalSettings");
export type ApprovalSettings = z.infer<typeof ApprovalSettings>;

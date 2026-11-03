import { z } from "../zod.js";

/** Why an approval is refused. The UI must have copy for every value. */
export const DenyReason = z
  .enum(["cannot_self_approve", "not_pending", "not_your_report"])
  .openapi("DenyReason");
export type DenyReason = z.infer<typeof DenyReason>;

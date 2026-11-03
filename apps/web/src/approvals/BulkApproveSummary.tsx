// apps/web/src/approvals/BulkApproveSummary.tsx
import type { BulkApproveResult } from "@acme/shared";
import { summarize } from "./selection";

type SkipReason = NonNullable<BulkApproveResult["reason"]>;

// Record<SkipReason, ...>: a new server reason doesn't compile until it has copy.
const reasonCopy: Record<SkipReason, string> = {
  cannot_self_approve: "You can't approve your own expense.",
  not_pending: "It's no longer waiting for approval.",
  not_your_report: "It belongs to someone outside your team.",
  not_found: "It no longer exists.",
};

export function BulkApproveSummary(
  { results, labels }: { results: BulkApproveResult[]; labels: Map<string, string> },
) {
  const skipped = results.filter((r) => r.outcome === "skipped");
  return (
    <section role="status" className="card">
      <strong>{summarize(results)}</strong>
      {skipped.length > 0 && (
        <ul>
          {skipped.map((r) => (
            <li key={r.expenseId}>
              {labels.get(r.expenseId) ?? r.expenseId}:{" "}
              {r.reason ? reasonCopy[r.reason] : "Skipped."}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

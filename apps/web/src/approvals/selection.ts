// Pure helpers for the Pending approvals screen, so the states are unit-tested.
import { MAX_BULK_APPROVE, type BulkApproveResult } from "@acme/shared";

export function toggle(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Explains the limit; the API enforces it. */
export function bulkBlocker(count: number): string | null {
  if (count === 0) return "Select the expenses to approve.";
  if (count > MAX_BULK_APPROVE) return `You can approve up to ${MAX_BULK_APPROVE} at once.`;
  return null;
}

/** "12 approved, 1 skipped" */
export function summarize(results: BulkApproveResult[]): string {
  const approved = results.filter((r) => r.outcome === "approved").length;
  return `${approved} approved, ${results.length - approved} skipped`;
}

import type { Status } from "@acme/shared";

// Record<Status, ...>: a new status doesn't compile until it has a label.
const LABELS: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  awaiting_finance: "Awaiting Finance",
  approved: "Approved",
  rejected: "Rejected",
  exported: "Exported",
};

/** `auto`: approved at submission because it was up to $75 (approvedBy "auto"). */
export function StatusBadge({ status, auto = false }: { status: Status; auto?: boolean }) {
  const label = status === "approved" && auto ? "Approved automatically" : LABELS[status];
  return <span className={`badge badge-${status}`}>{label}</span>;
}

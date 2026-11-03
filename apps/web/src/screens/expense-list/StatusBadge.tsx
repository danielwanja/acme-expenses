import type { Status } from "@acme/shared";

// Record<Status, ...>: a new status doesn't compile until it has a label.
const LABELS: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  exported: "Exported",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}

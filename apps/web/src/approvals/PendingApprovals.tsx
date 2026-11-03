import type { PendingItem } from "@acme/shared";
import { useState } from "react";
import { ApiCallError } from "../api";
import {
  useApprove, useBulkApprove, usePendingApprovals, useReject,
} from "../queries/approvals";
import { BulkApproveSummary } from "./BulkApproveSummary";
import { bulkBlocker, toggle } from "./selection";

const label = (e: PendingItem) =>
  `${e.employeeName}, ${e.amountDisplay}, ${e.category}`;

export function PendingApprovals() {
  // One call to the task-shaped endpoint: only what this user may approve.
  const pending = usePendingApprovals({ view: "full", limit: 50 });
  const approve = useApprove();
  const reject = useReject();
  const bulk = useBulkApprove();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [labels, setLabels] = useState(new Map<string, string>());
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Each mutation refetches the pending list when it succeeds.
  async function act(run: () => Promise<unknown>) {
    setError(null);
    try {
      await run();
      setRejecting(null);
      setReason("");
    } catch (e) {
      setError(e instanceof ApiCallError ? e.message : "Something went wrong.");
    }
  }

  function approveSelected() {
    const rows = pending.data?.items ?? [];
    // Names for the summary, before the refetch drops the approved rows.
    setLabels(new Map(rows.map((e) => [e.expenseId, label(e)])));
    setConfirming(false);
    bulk.mutate([...selected], { onSuccess: () => setSelected(new Set()) });
  }

  if (pending.isPending) return <p>Loading approvals…</p>;
  if (pending.isError) return <p role="alert">Couldn't load approvals.</p>;
  const rows = pending.data.items;

  const blocker = bulkBlocker(selected.size);
  return (
    <>
      {bulk.isSuccess && (
        <BulkApproveSummary results={bulk.data.results} labels={labels} />
      )}
      {bulk.isError && (
        <p role="alert">
          Nothing changed. Try again.{" "}
          <button type="button" onClick={approveSelected}>Retry</button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {rows.length === 0 ? <p>Nothing is waiting for you.</p> : (
        <>
          <div className="actions">
            <span>{selected.size} selected</span>
            {confirming ? (
              <>
                <span>Approve {selected.size} expenses?</span>
                <button type="button" onClick={approveSelected}>Confirm</button>
                <button type="button" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button"
                disabled={blocker !== null || bulk.isPending}
                onClick={() => setConfirming(true)}>
                {bulk.isPending ? "Approving…" : "Approve selected"}
              </button>
            )}
            {blocker && selected.size > 0 && (
              <span className="hint">{blocker}</span>
            )}
          </div>
          <table>
            <caption>Pending approvals</caption>
            <thead>
              <tr>
                <th>Select</th><th>Employee</th><th>Category</th><th>Amount</th>
                <th>Age</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.expenseId}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${label(e)}`}
                      checked={selected.has(e.expenseId)}
                      onChange={() => setSelected((s) => toggle(s, e.expenseId))} />
                  </td>
                  <td>{e.employeeName}</td>
                  <td>{e.category}</td>
                  <td>{e.amountDisplay}</td>
                  <td>{e.ageDays} d</td>
                  <td>
                    <button type="button"
                      onClick={() => void act(() => approve.mutateAsync(e.expenseId))}>
                      Approve
                    </button>
                    {rejecting === e.expenseId ? (
                      <>
                        <label>Reason<input value={reason}
                          onChange={(ev) => setReason(ev.target.value)} /></label>
                        <button type="button" disabled={!reason.trim()}
                          onClick={() => void act(() =>
                            reject.mutateAsync({ id: e.expenseId, reason }))}>
                          Reject expense
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setRejecting(e.expenseId)}>
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

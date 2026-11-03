import { formatMoney } from "@acme/shared";
import { useState } from "react";
import { ApiCallError } from "../api";
import {
  useApprove, usePendingApprovals, useReject,
} from "../queries/approvals";

export function PendingApprovals({ uid }: { uid: string }) {
  const pending = usePendingApprovals(uid);
  const approve = useApprove();
  const reject = useReject();
  const [error, setError] = useState<string | null>(null);
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

  if (pending.isPending) return <p>Loading approvals…</p>;
  if (pending.isError) return <p role="alert">Couldn't load approvals.</p>;
  const rows = pending.data;
  if (rows.length === 0) return <p>Nothing is waiting for you.</p>;

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <table>
        <caption>Pending approvals</caption>
        <thead>
          <tr><th>Employee</th><th>Category</th><th>Amount</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td>{e.employeeName}</td>
              <td>{e.category}</td>
              <td>{formatMoney({ amount: e.amountBase ?? e.amount, currency: "USD" })}</td>
              <td>
                <button type="button"
                  onClick={() => void act(() => approve.mutateAsync(e.id))}>
                  Approve
                </button>
                {rejecting === e.id ? (
                  <>
                    <label>Reason<input value={reason}
                      onChange={(ev) => setReason(ev.target.value)} /></label>
                    <button type="button" disabled={!reason.trim()}
                      onClick={() => void act(() => reject.mutateAsync({ id: e.id, reason }))}>
                      Reject expense
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setRejecting(e.id)}>Reject</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// The reference screen: later screens copy its loading, empty and error states.
import { formatMoney } from "@acme/shared";
import { useMyExpenses } from "../../queries/expenses";
import { Link } from "../../router";
import { StatusBadge } from "./StatusBadge";

export function ExpenseList({ uid }: { uid: string }) {
  const expenses = useMyExpenses(uid);

  if (expenses.isPending) return <p>Loading your expenses…</p>;
  if (expenses.isError) return <p role="alert">Couldn't load your expenses.</p>;
  const rows = expenses.data;
  if (rows.length === 0) {
    return <p>No expenses yet. <Link to="/expenses/new">Add one</Link>.</p>;
  }

  return (
    <table>
      <caption>My expenses</caption>
      <thead>
        <tr><th>Date</th><th>Category</th><th>Amount</th><th>Status</th></tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id}>
            <td>{e.spentOn}</td>
            <td>{e.category}</td>
            <td>
              {formatMoney(e)}
              {e.currency !== "USD" && e.amountBase !== undefined && (
                <small> ≈ {formatMoney({ amount: e.amountBase, currency: "USD" })}
                  {" "}at {e.fxRate} (rate of {e.fxRateDate})</small>
              )}
            </td>
            <td><StatusBadge status={e.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

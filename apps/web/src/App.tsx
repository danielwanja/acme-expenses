import { signOut } from "firebase/auth";
import { PendingApprovals } from "./approvals/PendingApprovals";
import { useSession } from "./auth";
import { auth } from "./firebase";
import { Link, usePath } from "./router";
import { ExpenseForm } from "./screens/expense-edit/ExpenseForm";
import { ExpenseList } from "./screens/expense-list/ExpenseList";
import { SignIn } from "./screens/sign-in/SignIn";

export function App() {
  const session = useSession();
  const path = usePath();

  if (session.state === "loading") return <main><p>Loading…</p></main>;
  if (session.state === "signedOut") return <main><SignIn /></main>;

  const { user, isManager, isFinance } = session;
  const canApprove = isManager || isFinance;
  let screen;
  if (path === "/expenses/new") screen = <ExpenseForm uid={user.uid} />;
  else if (path === "/approvals" && canApprove) screen = <PendingApprovals />;
  else screen = <ExpenseList uid={user.uid} />;

  return (
    <>
      <header>
        <strong>Acme Expenses</strong>
        <nav>
          <Link to="/expenses">My expenses</Link>
          <Link to="/expenses/new">New expense</Link>
          {canApprove && <Link to="/approvals">Approvals</Link>}
        </nav>
        <span className="who">{user.email}</span>
        <button type="button" onClick={() => void signOut(auth)}>Sign out</button>
      </header>
      <main>{screen}</main>
    </>
  );
}

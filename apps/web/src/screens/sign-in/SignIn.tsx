import { signInWithEmailAndPassword } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { auth } from "../../firebase";
import { navigate } from "../../router";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (window.location.pathname === "/signin") navigate("/expenses");
    } catch {
      setError("Wrong email or password.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h1>Sign in</h1>
      <label>Email<input type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password}
        onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}

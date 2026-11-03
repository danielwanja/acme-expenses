import { useQueryClient } from "@tanstack/react-query";
import { onIdTokenChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./firebase";

export type Session =
  | { state: "loading" }
  | { state: "signedOut" }
  | { state: "signedIn"; user: User; isManager: boolean; isFinance: boolean };

/** The signed-in user and the role claims the server and rules also use. */
export function useSession(): Session {
  const [session, setSession] = useState<Session>({ state: "loading" });
  const queryClient = useQueryClient();
  // A subscription, not data fetching: Firebase pushes every sign-in,
  // sign-out and token refresh, and the cleanup unsubscribes.
  useEffect(() => {
    let uid: string | null | undefined; // undefined until the first event
    return onIdTokenChanged(auth, async (user) => {
      const next = user?.uid ?? null;
      // Someone else (or no one) now: drop every cached answer, so no
      // screen shows the last user's data. A token refresh keeps it.
      if (uid !== undefined && uid !== next) queryClient.clear();
      uid = next;
      if (!user) return setSession({ state: "signedOut" });
      const { claims } = await user.getIdTokenResult();
      setSession({
        state: "signedIn",
        user,
        isManager: claims["role"] === "manager",
        isFinance: claims["finance"] === true,
      });
    });
  }, [queryClient]);
  return session;
}

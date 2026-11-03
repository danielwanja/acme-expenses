import { act, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { beforeEach, expect, test, vi } from "vitest";
import { useSession } from "./auth";
import { renderHookWithClient } from "./test/render";

type Listener = (user: User | null) => Promise<void>;
const firebase = vi.hoisted(() => ({ listener: undefined as unknown }));

vi.mock("./firebase", async () => (await import("./test/render")).fakeFirebase);
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth: unknown, listener: Listener) => {
    firebase.listener = listener;
    return () => {};
  },
}));

const user = (uid: string) => ({
  uid, getIdTokenResult: async () => ({ claims: {} }),
}) as unknown as User;

async function emit(next: User | null) {
  await act(() => (firebase.listener as Listener)(next));
}

beforeEach(() => { firebase.listener = undefined; });

test("a token refresh keeps the cache; another user clears it", async () => {
  const { result, client } = renderHookWithClient(() => useSession());
  await waitFor(() => expect(firebase.listener).toBeDefined());
  await emit(user("erin"));
  expect(result.current.state).toBe("signedIn");

  client.setQueryData(["expenses", "mine", "erin"], ["erin's expense"]);
  await emit(user("erin")); // refreshed token, same person
  expect(client.getQueryData(["expenses", "mine", "erin"])).toBeDefined();

  await emit(user("max")); // another tab signed in as someone else
  expect(client.getQueryData(["expenses", "mine", "erin"])).toBeUndefined();
});

test("signing out clears the cache", async () => {
  const { result, client } = renderHookWithClient(() => useSession());
  await waitFor(() => expect(firebase.listener).toBeDefined());
  await emit(user("erin"));
  client.setQueryData(["approvals", "pending"], ["for erin"]);
  await emit(null);
  expect(result.current.state).toBe("signedOut");
  expect(client.getQueryData(["approvals", "pending"])).toBeUndefined();
});

// Test helpers for components and hooks that use TanStack Query.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

/** A fresh client per test, so no cache leaks between tests. */
export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }, // fail fast in tests
  });
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

export function renderWithClient(ui: ReactNode, client = testQueryClient()) {
  return { client, ...render(ui, { wrapper: wrapperFor(client) }) };
}

export function renderHookWithClient<T>(
  hook: () => T, client = testQueryClient(),
) {
  return { client, ...renderHook(hook, { wrapper: wrapperFor(client) }) };
}

/** The signed-in user every web test runs as (mocks ../firebase). */
export const fakeFirebase = {
  auth: {
    authStateReady: async () => {},
    currentUser: { getIdToken: async () => "test-token" },
  },
  db: {},
};

/** A fetch stub that records requests and answers from a handler. */
export function fakeFetch(answer: (request: Request) => Response) {
  const requests: Request[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    return answer(request);
  };
  return { fetch, requests };
}

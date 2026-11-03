// A tiny router: three screens don't need a routing library.
import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function navigate(to: string): void {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function Link({ to, children }: { to: string; children: ReactNode }) {
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={onClick}>{children}</a>;
}

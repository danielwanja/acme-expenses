// apps/web/src/queries/settings.ts
import { useQuery } from "@tanstack/react-query";
import { loadApprovalSettings } from "../expenses";

export const settingsKeys = {
  all: ["settings"] as const,
  approval: () => [...settingsKeys.all, "approval"] as const,
};

/** settings/approval from Firestore, so the UI can explain the rule. */
export function useApprovalSettings() {
  return useQuery({
    queryKey: settingsKeys.approval(),
    queryFn: loadApprovalSettings,
  });
}

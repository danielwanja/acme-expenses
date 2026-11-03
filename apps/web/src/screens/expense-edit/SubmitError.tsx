// apps/web/src/screens/expense-edit/SubmitError.tsx
const MESSAGES: Record<string, string> = {
  fx_unavailable:
    "We couldn't get today's exchange rate. Your draft is saved. " +
    "Try submitting again in a few minutes.",
  receipt_required:
    "Expenses over $75 need a receipt. Your draft is saved; " +
    "attach a receipt, then submit it.",
};

export function SubmitError({ code }: { code: string }) {
  return (
    <p role="alert">
      {MESSAGES[code] ?? "Something went wrong. Your draft is saved."}
    </p>
  );
}

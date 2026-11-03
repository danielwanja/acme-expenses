import {
  CATEGORIES, convertToUsd, formatMoney, isReceiptRequired, NewExpense,
  parseAmountInput, RECEIPT_REQUIRED_ABOVE_CENTS, type Category,
} from "@acme/shared";
import { useState, type FormEvent } from "react";
import { ApiCallError } from "../../api";
import { useCreateDraft, useSubmitExpense } from "../../queries/expenses";
import { useFxRate } from "../../queries/fx";
import { navigate } from "../../router";
import { SubmitError } from "./SubmitError";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY"];
const today = () => new Date().toISOString().slice(0, 10);

/** "≈ $46.08 USD at 1.0842". The server converts again at submit. */
function FxPreview(
  { amount, currency }: { amount: number | null; currency: string },
) {
  const fx = useFxRate({ currency, date: today() }); // submit uses today
  if (currency === "USD" || !amount) return null; // USD, 0 or invalid
  if (fx.isLoading) return <p className="hint">Looking up today's rate…</p>;
  if (fx.isError) {
    return <p className="hint">Couldn't get today's rate to preview USD.</p>;
  }
  if (!fx.data) return null;
  // The same shared rule as submit: typing an amount never refetches.
  const usd = convertToUsd({ amount, currency }, fx.data.rate);
  return (
    <p className="hint" aria-live="polite">
      ≈ {formatMoney(usd)} USD at {fx.data.rate}
    </p>
  );
}

export function ExpenseForm({ uid }: { uid: string }) {
  const [amountText, setAmountText] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState<Category>("Meals");
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveDraft = useCreateDraft();
  const submit = useSubmitExpense();
  const busy = saveDraft.isPending || submit.isPending;

  const amount = parseAmountInput(amountText, currency);
  const submitError = submit.error instanceof ApiCallError
    ? submit.error.code : submit.error && "internal";
  // The hint explains the rule; the API enforces it on the converted amount.
  const receiptHint = currency === "USD" && amount !== null && isReceiptRequired(amount)
    && !receipt;

  async function save(andSubmit: boolean) {
    setError(null);
    submit.reset();
    const draft = NewExpense.safeParse({
      ownerId: uid, amount, currency, category, spentOn, note,
      // Uploading the image to Cloud Storage is out of scope for this repo;
      // the draft records where the receipt would live.
      receiptPath: receipt ? `receipts/${uid}/${receipt.name}` : null,
      status: "draft",
    });
    if (!draft.success) {
      setError(amount === null ? "Enter an amount like 42.50." : "Check the form.");
      return;
    }
    let id: string;
    try {
      id = await saveDraft.mutateAsync(draft.data);
    } catch {
      setError("Couldn't save the draft. Try again.");
      return;
    }
    if (andSubmit) {
      try {
        await submit.mutateAsync(id);
      } catch {
        return; // submit.error is on screen, through SubmitError
      }
    }
    navigate("/expenses");
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save(true);
  };

  return (
    <form onSubmit={onSubmit} className="card">
      <h1>New expense</h1>
      <label>Amount<input inputMode="decimal" value={amountText}
        onChange={(e) => setAmountText(e.target.value)} placeholder="42.50" /></label>
      <label>Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Category
        <select value={category}
          onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Date<input type="date" value={spentOn}
        onChange={(e) => setSpentOn(e.target.value)} /></label>
      <label>Note<textarea value={note} maxLength={500}
        onChange={(e) => setNote(e.target.value)} /></label>
      <label>Receipt<input type="file" accept="image/*,application/pdf"
        onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} /></label>
      {receiptHint && (
        <p className="hint">
          Expenses over {formatMoney({ amount: RECEIPT_REQUIRED_ABOVE_CENTS, currency: "USD" })}
          {" "}need a receipt before you can submit. You can still save a draft.
        </p>
      )}
      <FxPreview amount={amount} currency={currency} />
      {error && <p role="alert">{error}</p>}
      {submitError && <SubmitError code={submitError} />}
      {busy && currency !== "USD" && <p className="hint">Getting today's exchange rate…</p>}
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void save(false)}>
          Save draft
        </button>
        <button type="submit" disabled={busy}>Submit</button>
      </div>
    </form>
  );
}

// Money is integer minor units plus an ISO 4217 code. Never floats.
import type { Money } from "../schemas/money.js";

/** Minor digits for a currency: USD 2, JPY 0, KWD 3. */
export function minorDigits(currency: string): number {
  return new Intl.NumberFormat("en-US", { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits ?? 2;
}

const RATE_SCALE = 100_000_000n; // rates are used to 8 decimal places

/**
 * Converts minor units of `currency` to USD cents.
 * `rate` is USD per one major unit of the source currency.
 * Rounding rule (Finance): round half up to the nearest cent.
 */
export function convertToUsd(money: Money, rate: number): Money {
  if (!Number.isSafeInteger(money.amount) || money.amount < 0) {
    throw new RangeError(`amount must be a non-negative integer: ${money.amount}`);
  }
  if (!(rate > 0)) throw new RangeError(`rate must be positive: ${rate}`);
  const scaledRate = BigInt(Math.round(rate * Number(RATE_SCALE)));
  const numerator = BigInt(money.amount) * scaledRate * 100n;
  const denominator = RATE_SCALE * 10n ** BigInt(minorDigits(money.currency));
  const cents = (numerator * 2n + denominator) / (denominator * 2n); // half up
  return { amount: Number(cents), currency: "USD" };
}

/** Parses what a person types ("42.50") into minor units, or null. */
export function parseAmountInput(text: string, currency: string): number | null {
  const digits = minorDigits(currency);
  const m = /^(\d{1,9})(?:\.(\d+))?$/.exec(text.trim().replaceAll(",", ""));
  if (!m) return null;
  const [, whole = "0", frac = ""] = m;
  if (frac.length > digits) return null;
  return Number(whole) * 10 ** digits + Number(frac.padEnd(digits, "0") || "0");
}

/** "$42.50", "¥1,000". Formats from a decimal string, so no float math. */
export function formatMoney({ amount, currency }: Money): string {
  const digits = minorDigits(currency);
  const s = String(Math.abs(amount)).padStart(digits + 1, "0");
  const decimal = digits === 0 ? s : `${s.slice(0, -digits)}.${s.slice(-digits)}`;
  const nf = new Intl.NumberFormat("en-US", { style: "currency", currency });
  const text = nf.format(decimal as Intl.StringNumericLiteral);
  return amount < 0 ? `-${text}` : text;
}

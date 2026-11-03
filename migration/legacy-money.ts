// migration/legacy-money.ts
// number_format() adds thousands separators: "1,234.50"
const AMOUNT = /^(-?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

export function legacyAmountToCents(raw: string): number {
  const m = AMOUNT.exec(raw.trim());
  if (!m) throw new Error(`Unparseable legacy amount: "${raw}"`);
  const [, sign, whole, frac = ""] = m;
  const cents = Number(whole.replaceAll(",", "")) * 100
    + Number(frac.padEnd(2, "0"));
  return sign ? -cents : cents;
}

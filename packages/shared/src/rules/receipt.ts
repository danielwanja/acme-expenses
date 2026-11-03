// packages/shared/src/rules/receipt.ts

/** Expenses over $75 in company currency need a receipt. */
export const RECEIPT_REQUIRED_ABOVE_CENTS = 7_500;

export function isReceiptRequired(amountBase: number): boolean {
  return amountBase > RECEIPT_REQUIRED_ABOVE_CENTS;
}

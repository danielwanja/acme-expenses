// The exchange rate behind the form's USD preview. The browser converts
// with convertToUsd(), the rule submit uses; the server converts again.
import { z } from "../zod.js";
import { CalendarDate, CurrencyCode } from "./expense.js";

export const FxRateQuery = z.object({
  currency: CurrencyCode,
  date: CalendarDate.openapi({ description: "The day of the rate" }),
});
export type FxRateQuery = z.infer<typeof FxRateQuery>;

export const FxRate = z
  .object({
    currency: CurrencyCode,
    base: z.literal("USD"),
    date: CalendarDate
      .openapi({ description: "The provider's date for the rate" }),
    rate: z.number().positive()
      .openapi({ description: "USD per one unit of currency" }),
  })
  .openapi("FxRate");
export type FxRate = z.infer<typeof FxRate>;

// apps/api/src/services/fx-schemas.ts
import { z } from "zod";
import type { components } from "./fx-api";

const Currency = z.string().regex(/^[A-Z]{3}$/);

export const RatesResponse = z.object({
  base: Currency,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.record(Currency, z.number().positive()),
});
export type Rates = z.infer<typeof RatesResponse>;

// Breaks npm run typecheck if the schema and the spec drift apart.
type Spec = components["schemas"]["RatesResponse"];
type Assert<T extends true> = T;
export type RatesMatchSpec = Assert<Rates extends Spec ? true : false>;

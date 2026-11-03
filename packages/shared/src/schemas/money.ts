// packages/shared/src/schemas/money.ts
// Money is integer minor units plus an ISO 4217 code. Never floats.
import { z } from "../zod.js"; // calls extendZodWithOpenApi(z) once

export const Money = z
  .object({
    amount: z.number().int().nonnegative()
      .openapi({ description: "Integer minor units (cents for USD)" }),
    currency: z.string().length(3)
      .openapi({ description: "ISO 4217 code", example: "EUR" }),
  })
  .openapi("Money");
export type Money = z.infer<typeof Money>;

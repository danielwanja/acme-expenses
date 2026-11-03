import { z } from "../zod.js";

/** The one error body every non-2xx response uses. */
export const ApiError = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "invalid_query" }),
      message: z.string(),
      hint: z.string().optional()
        .openapi({ description: "What to do next" }),
      requestId: z.string(),
    }),
  })
  .openapi("ApiError");
export type ApiError = z.infer<typeof ApiError>;

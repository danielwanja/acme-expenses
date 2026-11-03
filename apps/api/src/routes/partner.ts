// apps/api/src/routes/partner.ts
import { ExpenseIdParams, ExportHeaders, ExportResult, ListExpensesQuery } from "@acme/shared";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { partnerOf, requirePartnerKey } from "../middleware/partner-key.js";
import { markExported } from "../services/export.js";
import { listExpenses } from "../services/partner-expenses.js";

export const partner = Router();

// Per route, not partner.use(): people's routes share the /api mount.
partner.get("/v1/expenses", requirePartnerKey, async (req, res) => {
  const q = ListExpensesQuery.safeParse(req.query);
  if (!q.success) {
    throw new HttpError(400, "invalid_query", z.prettifyError(q.error),
      "limit must be 1-100; pass nextCursor back as cursor.");
  }
  res.json(await listExpenses(q.data));
});

partner.post("/v1/expenses/:id/export", requirePartnerKey, async (req, res) => {
  const { id } = ExpenseIdParams.parse(req.params);
  const headers = ExportHeaders.safeParse({ "idempotency-key": req.get("idempotency-key") });
  if (!headers.success) {
    throw new HttpError(400, "missing_idempotency_key",
      "Send an Idempotency-Key header with this request.",
      "Use a new random key per expense, and the same key when you retry.");
  }
  const key = headers.data["idempotency-key"];
  const result = await markExported({ partnerId: partnerOf(res), key, expenseId: id });
  res.json(ExportResult.parse(result));
});

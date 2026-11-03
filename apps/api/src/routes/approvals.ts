import { PendingQuery } from "@acme/shared";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { requireAuth, userOf } from "../middleware/auth.js";
import { listPending } from "../services/pending.js";

export const approvals = Router();

// Task-shaped for people and agents: "what's waiting for me?" in one call.
approvals.get("/v1/approvals/pending", requireAuth, async (req, res) => {
  const q = PendingQuery.safeParse(req.query);
  if (!q.success) {
    throw new HttpError(400, "invalid_query", z.prettifyError(q.error),
      "limit must be 1-50; view is summary or full.");
  }
  res.json(await listPending(userOf(req), q.data));
});

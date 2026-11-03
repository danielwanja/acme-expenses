import { ApprovalSettings } from "@acme/shared";
import { Router } from "express";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { requireFreshAuth, userOf } from "../middleware/auth.js";

export const settings = Router();

// The threshold is config, so it changes without a deploy. Treat it like code:
// admins only, validated, and every change recorded with who and when.
settings.put("/v1/settings/approval", requireFreshAuth, async (req, res) => {
  const user = userOf(req);
  if (user["admin"] !== true) {
    throw new HttpError(403, "not_an_admin", "Only admins can change approval settings.");
  }
  const body = ApprovalSettings.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "invalid_body", z.prettifyError(body.error));
  const db = getFirestore();
  const ref = db.doc("settings/approval");
  await db.runTransaction(async (tx) => {
    const before = (await tx.get(ref)).data() ?? null;
    tx.set(ref, { ...body.data, updatedBy: user.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.create(ref.collection("history").doc(), {
      before, after: body.data, changedBy: user.uid, changedAt: FieldValue.serverTimestamp(),
    });
  });
  res.json(ApprovalSettings.parse(body.data));
});

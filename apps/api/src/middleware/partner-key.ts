// apps/api/src/middleware/partner-key.ts
import { createHash } from "node:crypto";
import type { RequestHandler, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { HttpError } from "../errors.js";

// Only a SHA-256 hash of each key is stored: partnerKeys/{hash}.
export const requirePartnerKey: RequestHandler = async (req, res, n) => {
  const key = req.get("x-api-key");
  if (!key) throw new HttpError(401, "missing_api_key",
    "Send your partner key in the X-Api-Key header.");
  const hash = createHash("sha256").update(key).digest("hex");
  const snap = await getFirestore().doc(`partnerKeys/${hash}`).get();
  if (!snap.exists || snap.get("revoked") === true) {
    throw new HttpError(401, "invalid_api_key",
      "This key is unknown or revoked.", "Ask Acme for a new key.");
  }
  res.locals.partnerId = snap.get("partnerId") as string;
  n();
};

/** The partner requirePartnerKey identified. */
export function partnerOf(res: Response): string {
  const id: unknown = res.locals.partnerId;
  if (typeof id !== "string") throw new HttpError(401, "missing_api_key", "No partner key.");
  return id;
}

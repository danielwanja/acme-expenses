import type { Request, RequestHandler } from "express";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { HttpError } from "../errors.js";

declare module "express-serve-static-core" { interface Request { user?: DecodedIdToken } }

function verifyToken(checkRevoked: boolean): RequestHandler {
  return async (req, _res, next) => {
    const m = /^Bearer (.+)$/.exec(req.get("authorization") ?? "");
    const token = m?.[1];
    if (!token) {
      throw new HttpError(401, "missing_token",
        "Send a Firebase ID token in the Authorization header.",
        "Use 'Authorization: Bearer <ID token>'.");
    }
    try {
      req.user = await getAuth().verifyIdToken(token, checkRevoked);
    } catch {
      throw new HttpError(401, "invalid_token",
        "The ID token is invalid, expired or revoked.", "Sign in again.");
    }
    next();
  };
}

/** Verifies the Firebase ID token. The default call doesn't check revocation. */
export const requireAuth = verifyToken(false);

/** Same, but also rejects revoked tokens. Use it where it matters: approvals. */
export const requireFreshAuth = verifyToken(true);

/** The verified caller. Only call it in a route behind requireAuth. */
export function userOf(req: Request): DecodedIdToken {
  if (!req.user) throw new HttpError(401, "missing_token", "Not signed in.");
  return req.user;
}

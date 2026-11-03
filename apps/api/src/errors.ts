import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public hint?: string,
  ) { super(message); }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _n) => {
  const requestId = req.get("x-request-id") ?? randomUUID();
  if (err instanceof HttpError) {
    const { status, code, message, hint } = err;
    res.status(status).json({ error: { code, message, hint, requestId } });
    return;
  }
  console.error({ requestId, err });
  res.status(500).json({ error: { code: "internal",
    message: "Something failed on our side. Retry later.", requestId } });
};

// The plain Express 5 app. No firebase-functions imports, so the same app can
// run on Cloud Run behind a five-line server.ts.
import express, {
  type ErrorRequestHandler, type RequestHandler,
} from "express";
import { HttpError, errorHandler } from "./errors.js";
import { approvals } from "./routes/approvals.js";
import { expenses } from "./routes/expenses.js";
import { fx } from "./routes/fx.js";
import { partner } from "./routes/partner.js";
import { settings } from "./routes/settings.js";
import { FxError } from "./services/fx-client.js";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Routes start at /v1; callers use /api/v1/... (the Hosting rewrite keeps /api).
app.use("/api", expenses, approvals, partner, settings, fx);

const noRoute: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "no_route", `No route for ${req.method} ${req.path}.`));
};
// express.json() reports malformed bodies as errors with type entity.parse.failed.
const badJson: ErrorRequestHandler = (err, _req, _res, next) => {
  const type = (err as { type?: unknown }).type;
  next(type === "entity.parse.failed"
    ? new HttpError(400, "invalid_json", "The request body is not valid JSON.")
    : err);
};

// The internal FX code goes to the logs; callers get one stable error.
const fxErrors: ErrorRequestHandler = (err, _req, _res, next) => {
  if (!(err instanceof FxError)) return next(err);
  console.error("rates provider failed", err.code, err.message);
  next(new HttpError(err.code === "rejected" ? 502 : 503,
    "fx_unavailable", "Exchange rate unavailable.",
    "Your draft is saved. Try submitting again in a few minutes."));
};

app.use(noRoute);
app.use(badJson);
app.use(fxErrors); // must come before errorHandler
app.use(errorHandler);

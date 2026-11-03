// apps/api/src/routes/fx.ts
// GET /v1/fx/rate: the rate behind the form's USD preview. The browser
// converts with the shared rule; submit converts again on the server.
import { FxRate, FxRateQuery } from "@acme/shared";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { FxError } from "../services/fx-client.js";
import { ratesFor } from "../services/fx-rates.js";

export const fx = Router();

fx.get("/v1/fx/rate", requireAuth, async (req, res) => {
  const q = FxRateQuery.safeParse(req.query);
  if (!q.success) {
    throw new HttpError(400, "invalid_query", z.prettifyError(q.error));
  }
  const { currency, date } = q.data;
  let rate = 1; // USD needs no provider
  let rateDate = date;
  if (currency !== "USD") {
    // FxError becomes 502/503 fx_unavailable in app.ts, as at submit.
    const fx = await ratesFor(date, currency);
    const usd = fx.rates["USD"];
    if (usd === undefined) {
      throw new FxError("bad_response", `no USD rate for ${fx.base}`);
    }
    rate = usd;
    rateDate = fx.date; // the provider's date, not the one we asked for
  }
  res.json(FxRate.parse({ currency, base: "USD", date: rateDate, rate }));
});

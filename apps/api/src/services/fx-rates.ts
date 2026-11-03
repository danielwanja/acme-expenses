// apps/api/src/services/fx-rates.ts
// Daily rates, read through a Firestore cache that every instance shares.
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getRates } from "./fx-client.js";
import { RatesResponse, type Rates } from "./fx-schemas.js";

const TODAY_FRESH_MS = 60 * 60 * 1000; // today's rates: an hour, then ask

// Concurrent calls on this instance share one lookup. Memory is per
// instance and not shared, so this only dedupes; Firestore is the cache.
const inFlight = new Map<string, Promise<Rates>>();

export function ratesFor(date: string, base: string): Promise<Rates> {
  const key = `${date}_${base}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = readThrough(key, date, base);
    inFlight.set(key, pending);
    const settled = () => inFlight.delete(key); // not a cache
    pending.then(settled, settled);
  }
  return pending;
}

async function readThrough(key: string, date: string, base: string) {
  const ref = getFirestore().collection("fxRates").doc(key);
  const doc = (await ref.get()).data();
  const cached = RatesResponse.safeParse(doc);
  if (cached.success && isFresh(date, doc?.["fetchedAt"])) {
    return cached.data;
  }
  const rates = await getRates(date, base);
  await ref.set({ ...rates, fetchedAt: FieldValue.serverTimestamp() });
  return rates;
}

/** A past day's rates are final. Today's can still change. */
function isFresh(date: string, fetchedAt: unknown): boolean {
  const today = new Date().toISOString().slice(0, 10); // UTC
  if (date < today) return true;
  return fetchedAt instanceof Timestamp
    && Date.now() - fetchedAt.toMillis() < TODAY_FRESH_MS;
}

import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { Status } from "@acme/shared";
import { logger, setGlobalOptions } from "firebase-functions";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/firestore";
import { onRequest } from "firebase-functions/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { app } from "./app";
import { configureFx } from "./services/fx-client";
import { notificationFor } from "./services/notifications";

initializeApp();
setGlobalOptions({ region: "europe-west1" });

const fxApiKey = defineSecret("FX_API_KEY");
const fxBaseUrl = defineString("FX_BASE_URL");

configureFx({
  baseUrl: () => fxBaseUrl.value(),
  apiKey: () => {
    const key = fxApiKey.value(); // read at request time, not load
    if (!key) throw new Error("FX_API_KEY is not set");
    return key;
  },
});

// HTTP API: Hosting rewrites /api/** here.
export const api = onRequest({ secrets: [fxApiKey] }, app);

// A new draft gets a server timestamp; clients can't set createdAt themselves.
export const onExpenseCreated = onDocumentCreated("expenses/{expenseId}", async (event) => {
  if (!event.data) return;
  logger.info("expense created", { id: event.params.expenseId });
  await event.data.ref.update({ createdAt: FieldValue.serverTimestamp() });
});

// Messages follow status transitions, so "approved" is only ever sent when the
// server wrote approved. The queue is read by whatever sends Acme's email.
export const onExpenseUpdated = onDocumentUpdated("expenses/{expenseId}", async (event) => {
  const before = event.data?.before.get("status") as Status | undefined;
  const after = event.data?.after.get("status") as Status | undefined;
  const n = notificationFor(before, after);
  if (!n) return;
  const expenseId = event.params.expenseId;
  logger.info("notify", { expenseId, ...n });
  await getFirestore().collection("notifications").add({
    ...n,
    expenseId,
    ownerId: event.data?.after.get("ownerId") ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
});

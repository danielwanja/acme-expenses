import { initializeApp } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { logger, setGlobalOptions } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/firestore";
import { onRequest } from "firebase-functions/https";
import { app } from "./app";

initializeApp();
setGlobalOptions({ region: "europe-west1" });

// HTTP API: Hosting rewrites /api/** here.
export const api = onRequest(app);

// A new draft gets a server timestamp; clients can't set createdAt themselves.
export const onExpenseCreated = onDocumentCreated("expenses/{expenseId}", async (event) => {
  if (!event.data) return;
  logger.info("expense created", { id: event.params.expenseId });
  await event.data.ref.update({ createdAt: FieldValue.serverTimestamp() });
});

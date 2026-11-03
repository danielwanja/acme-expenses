// A minimal in-memory stand-in for the Admin SDK's Firestore: just the
// collection().doc().get()/set() that services/fx-rates.ts uses.
// FieldValue sentinels (serverTimestamp()) are stored as Timestamp.now().
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type Data = Record<string, unknown>;

const docs = new Map<string, Data>();

const resolve = (data: Data): Data => Object.fromEntries(Object.entries(data)
  .map(([k, v]) => [k, v instanceof FieldValue ? Timestamp.now() : v]));

export const fakeFirestore = {
  docs,
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => ({ data: () => docs.get(`${name}/${id}`) }),
      set: async (data: Data) => {
        docs.set(`${name}/${id}`, resolve(data));
      },
    }),
  }),
};

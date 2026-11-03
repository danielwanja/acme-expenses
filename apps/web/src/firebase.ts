import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// The Firebase web config is not secret. Set VITE_FIREBASE_* for a real project.
const env = import.meta.env;
export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "demo-acme.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "demo-acme",
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// On your machine (npm run dev, or the Hosting emulator) talk to the emulators.
if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const isMissingConfig = !firebaseConfig.apiKey || !firebaseConfig.projectId;

if (isMissingConfig) {
  console.warn(
    "[Glad Libs] Firebase env vars not set. Auth features will not work. " +
    "See client/.env.example for required variables."
  );
}

let app = null;
let auth = null;

if (!isMissingConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export function setupRecaptcha(containerId) {
  if (!auth) return null;
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}

export { app, auth };

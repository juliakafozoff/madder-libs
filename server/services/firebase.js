const admin = require("firebase-admin");

let firebaseApp = null;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  let credential = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err.message);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      credential = admin.credential.cert(serviceAccount);
    } catch (err) {
      console.error("Failed to load FIREBASE_SERVICE_ACCOUNT_PATH:", err.message);
    }
  }

  if (!credential) {
    console.warn(
      "[Glad Libs] Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH. Auth endpoints will return 503."
    );
    return null;
  }

  firebaseApp = admin.initializeApp({ credential });
  return firebaseApp;
}

async function verifyToken(idToken) {
  if (!firebaseApp) {
    initFirebase();
  }
  if (!firebaseApp) {
    return null;
  }
  return admin.auth().verifyIdToken(idToken);
}

// Initialize on load
initFirebase();

module.exports = { verifyToken, initFirebase };

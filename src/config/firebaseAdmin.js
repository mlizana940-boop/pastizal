const fs = require("node:fs");
const { applicationDefault, cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

function getCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialPath) {
      try {
        if (!fs.statSync(credentialPath).isFile()) throw new Error("not a file");
        fs.accessSync(credentialPath, fs.constants.R_OK);
      } catch {
        throw new Error(
          "GOOGLE_APPLICATION_CREDENTIALS no apunta a un archivo de credenciales legible. " +
          "Corrige la ruta o configura FIREBASE_SERVICE_ACCOUNT_JSON."
        );
      }
    }
    return applicationDefault();
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON debe contener JSON válido.");
  }

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  return cert(serviceAccount);
}

const app = getApps()[0] || initializeApp({
  credential: getCredential(),
  ...(process.env.FIREBASE_PROJECT_ID
    ? { projectId: process.env.FIREBASE_PROJECT_ID }
    : {})
});

const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { auth, db };

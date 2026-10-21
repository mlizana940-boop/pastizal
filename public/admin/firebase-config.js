// Completa estos valores desde la configuración de la aplicación web en Firebase Console.
// Esta configuración de cliente no contiene la credencial privada del Admin SDK.
export const firebaseConfig = {
  apiKey: "REEMPLAZAR",
  authDomain: "REEMPLAZAR.firebaseapp.com",
  projectId: "REEMPLAZAR",
  appId: "REEMPLAZAR"
};

export const firebaseConfigReady = Object.values(firebaseConfig)
  .every((value) => typeof value === "string" && value && !value.includes("REEMPLAZAR"));
// Completa estos valores desde la configuración de la aplicación web en Firebase Console.
// Esta configuración de cliente no contiene la credencial privada del Admin SDK.
export const firebaseConfig = {
  apiKey: "AIzaSyBmcC-Jf_-r5mrzoHVg9aUidV5K33VIheg",
  authDomain: "reservas-cabanias.firebaseapp.com",
  projectId: "reservas-cabanias",
  appId: "1:107271795599:web:b02fb91c890ac59be391fa"
};

export const firebaseConfigReady = Object.values(firebaseConfig)
  .every((value) => typeof value === "string" && value && !value.includes("REEMPLAZAR"));

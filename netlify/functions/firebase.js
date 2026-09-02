import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

console.log("VARIABLES DISPONIBLES:", Object.keys(process.env).filter(key =>
  key.startsWith("FIREBASE_")
));

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log("Firebase env check:", {
  projectId: !!projectId,
  clientEmail: !!clientEmail,
  privateKey: !!privateKey,
});

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    `Faltan variables Firebase: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`
  );
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export const db = getFirestore();
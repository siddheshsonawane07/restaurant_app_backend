import admin from 'firebase-admin';
import 'dotenv/config';

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK (singleton)
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  // If Firebase was already initialized by another import
  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0];
    return firebaseApp;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Missing Firebase Admin environment variables');
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log(' Firebase Admin initialized successfully');

  return firebaseApp;
};

/**
 * Firestore
 */
export const getFirestore = () => {
  initializeFirebase();
  return admin.firestore();
};

/**
 * Auth
 */
export const getAuth = () => {
  initializeFirebase();
  return admin.auth();
};

/**
 * Storage (optional)
 */
export const getStorage = () => {
  initializeFirebase();
  return admin.storage();
};

export { initializeFirebase };

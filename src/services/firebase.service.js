import admin from 'firebase-admin';

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK using individual environment variables
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if already initialized to prevent double-initialization errors
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      return firebaseApp;
    }

    // Construct the service account object from separate .env variables
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The replace() ensures the private key's newlines are parsed correctly
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
      throw new Error("Missing Firebase configuration environment variables.");
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
};

// AUTO-INITIALIZE when this module is imported
initializeFirebase();

/**
 * Get Firestore instance
 */
export const getFirestore = () => {
  if (!firebaseApp) initializeFirebase();
  return admin.firestore();
};

/**
 * Get Firebase Auth instance
 */
export const getAuth = () => {
  if (!firebaseApp) initializeFirebase();
  return admin.auth();
};

/**
 * Get Firebase Storage instance
 */
export const getStorage = () => {
  if (!firebaseApp) initializeFirebase();
  return admin.storage();
};

export { initializeFirebase };
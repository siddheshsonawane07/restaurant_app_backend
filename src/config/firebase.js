import admin from 'firebase-admin'
import 'dotenv/config' 

let firebaseApp

console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID)
export const initFirebase = () => {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }

  return firebaseApp
}

export const getAuth = () => {
  if (!firebaseApp) {
    initFirebase()
  }
  return admin.auth()
}

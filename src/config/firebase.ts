import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_api_key_here'
)

let app: FirebaseApp
let auth: Auth
let db: Firestore

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  // Graceful initialization for local testing / demo mode without crashing
  const dummyApp = getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: 'AIzaSyDummyKeyForDevelopmentEnvironmentOnly00',
        authDomain: 'koneksi-app-dev.firebaseapp.com',
        projectId: 'koneksi-app-dev',
        storageBucket: 'koneksi-app-dev.appspot.com',
        messagingSenderId: '123456789012',
        appId: '1:123456789012:web:abcdef1234567890abcdef',
      })
  app = dummyApp
  auth = getAuth(dummyApp)
  db = getFirestore(dummyApp)
}

export const googleAuthProvider = new GoogleAuthProvider()
googleAuthProvider.setCustomParameters({ prompt: 'select_account' })

export { app, auth, db }

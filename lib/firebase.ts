import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Build-safe fallback to read config from json or public env
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || '(default)';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('openid');
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Expose custom token sign-in helper when in browser context
if (typeof window !== 'undefined') {
  (window as unknown as { __smritiSignInWithCustomToken?: (token: string) => ReturnType<typeof signInWithCustomToken> }).__smritiSignInWithCustomToken = (token: string) =>
    signInWithCustomToken(auth, token);
}

export { app };

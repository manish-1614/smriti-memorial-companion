import { getApps, initializeApp, App, cert, applicationDefault, AppOptions } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';
import firebaseConfig from '../firebase-applet-config.json';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId;

  const options: AppOptions = {};
  if (projectId) {
    options.projectId = projectId;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      options.credential = cert(serviceAccount);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to default credentials:', e);
    }
  }

  // If no explicit service account key was provided, attempt Application Default Credentials (ADC)
  // On Google Cloud Run / Cloud Build, this automatically leverages the environment's service account.
  if (!options.credential) {
    try {
      options.credential = applicationDefault();
    } catch (e) {
      // In local dev without ADC, do not attach an invalid credential property
      console.info('Application default credentials not available, initializing Firebase Admin with project ID only:', e);
    }
  }

  adminApp = initializeApp(options);

  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    const app = getFirebaseAdminApp();
    const databaseId =
      process.env.FIREBASE_DATABASE_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID ||
      firebaseConfig.firestoreDatabaseId ||
      '(default)';
    adminFirestore =
      databaseId && databaseId !== '(default)'
        ? getFirestore(app, databaseId)
        : getFirestore(app);
  }
  return adminFirestore;
}

export interface AuthVerificationResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  token?: DecodedIdToken;
  error?: string;
}

/**
 * Verifies Firebase ID Token from incoming NextRequest Authorization header.
 * Rejects with 401 if missing, malformed, or invalid.
 */
export async function verifyAuthToken(req: NextRequest): Promise<AuthVerificationResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Missing Authorization header. Please sign in with Google.',
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Malformed Authorization header. Format must be "Bearer <token>".',
    };
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return {
      authenticated: false,
      error: 'Authorization token is empty.',
    };
  }

  try {
    const app = getFirebaseAdminApp();
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    return {
      authenticated: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      token: decodedToken,
    };
  } catch (err: unknown) {
    console.error('Firebase token verification error:', err);
    const message = err instanceof Error ? err.message : 'Invalid or expired authentication token.';
    return {
      authenticated: false,
      error: message,
    };
  }
}

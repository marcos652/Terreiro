import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    process.env.NEXT_PUBLIC_FIREBASE_APFI_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const isBrowser = typeof window !== 'undefined';
const requiredConfig = [
  ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
] as const;
const missingFirebaseConfig = requiredConfig
  .filter(([, value]) => !value)
  .map(([key]) => key);
const hasConfig = missingFirebaseConfig.length === 0;

const app =
  hasConfig
    ? getApps().length > 0
      ? getApp()
      : initializeApp(firebaseConfig)
    : undefined;

export const db: Firestore = app ? getFirestore(app) : (null as unknown as Firestore);
export const auth: Auth = app ? getAuth(app) : (null as unknown as Auth);
export const firebaseConfigMissing = missingFirebaseConfig;

// Analytics should only be initialized in the browser.
let analytics: import('firebase/analytics').Analytics | undefined = undefined;
if (isBrowser && app && firebaseConfig.measurementId) {
  try {
    const { getAnalytics, isSupported } = require('firebase/analytics');
    isSupported()
      .then((supported: boolean) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {
        analytics = undefined;
      });
  } catch (e) {
    // Analytics not available.
    analytics = undefined;
  }
}

export { analytics };

/**
 * lib/firebase-admin.ts — Firebase Admin SDK initialization.
 *
 * Configured entirely from env (no JSON key files on disk):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   (the private key may arrive with literal "\n" sequences — handled here).
 *
 * Returns null when unconfigured so callers can skip push delivery without
 * throwing — email must keep working regardless (contract: channels are
 * isolated).
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let cachedApp: App | null | undefined;
let cachedMessaging: Messaging | null | undefined;

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function getFirebaseApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;
  if (!isFirebaseConfigured()) {
    cachedApp = null;
    return null;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  // Reuse the default app across hot reloads / warm lambdas.
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  });
  return cachedApp;
}

/** Messaging instance, or null when Firebase is not configured. */
export function getFirebaseMessaging(): Messaging | null {
  if (cachedMessaging !== undefined) return cachedMessaging;
  const app = getFirebaseApp();
  cachedMessaging = app ? getMessaging(app) : null;
  return cachedMessaging;
}

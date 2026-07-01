/**
 * Firebase Cloud Messaging setup helper (PRD §5.15).
 *
 * Phase 1 only sets up the plumbing: service worker registration, FCM token
 * request, and a `/api/notifications/register-token` endpoint stub. Actual
 * notification firing begins in Phase 2 alongside order status changes.
 *
 * All Firebase credentials are read from environment variables; if missing,
 * the helpers no-op gracefully so the rest of the app continues to function.
 */

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  projectId: process.env.FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
};

export function isFcmConfigured(): boolean {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.appId &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.messagingSenderId,
  );
}

export function getFcmConfig() {
  return FIREBASE_CONFIG;
}

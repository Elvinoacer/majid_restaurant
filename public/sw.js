/**
 * Minimal service worker for FCM background notifications (PRD §5.15).
 *
 * Firebase Messaging will import this file as part of its SW registration when
 * Phase 2 activates the actual notification firing. For Phase 1 we install it
 * so the SW is registered and ready — saving a Phase 2 deploy step.
 *
 * Path: /sw.js (served from public root).
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  // Phase 2 will wire this to actual notification display. For now, log.
  if (process.env.NODE_ENV !== "production") {
    console.log("[sw] push received (Phase 1 plumbing)");
  }
});

"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFcmConfigured } from "@/lib/notifications/fcm";

type FcmOptInProps = {
  restaurantSlug: string;
};

/**
 * Phase 1 FCM opt-in button.
 *
 * Per PRD §5.15, only the *plumbing* belongs to Phase 1 — actual notification
 * firing starts in Phase 2. This button:
 *   1. Requests notification permission.
 *   2. Registers a Firebase messaging token (if Firebase creds are present).
 *   3. POSTs the token to /api/notifications/register-token for later use.
 *
 * If FCM env vars aren't configured, the button still requests browser-level
 * Notification permission so the upgrade path is clean.
 */
export function FcmOptIn({ restaurantSlug }: FcmOptInProps) {
  const [permission, setPermission] = useState<NotificationPermission | "default">(
    "default",
  );
  const [configured] = useState(isFcmConfigured());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted" && configured) {
      try {
        // Lazy-load firebase/messaging only when actually needed.
        const { initializeApp } = await import("firebase/app");
        const { getMessaging, getToken } = await import("firebase/messaging");

        const cfg = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
          projectId: process.env.FIREBASE_PROJECT_ID!,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        };
        const app = initializeApp(cfg);
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
        });

        await fetch("/api/notifications/register-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, restaurantSlug }),
        });
      } catch (e) {
        console.warn("[FCM] token registration failed:", e);
      }
    } else if (result === "granted") {
      // FCM not configured — log so the developer knows plumbing is in place.
      console.info(
        "[FCM] permission granted, but Firebase env vars not set — notifications will fire once Phase 2 wiring is added.",
      );
    }
  };

  if (permission === "granted") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="gap-1.5 border-green-500/40 text-green-700"
      >
        <Bell className="h-4 w-4" />
        Notifications on
      </Button>
    );
  }

  if (permission === "denied") {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5">
        <BellOff className="h-4 w-4" />
        Blocked
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={requestPermission}
      className="gap-1.5"
    >
      <Bell className="h-4 w-4" />
      Enable updates
    </Button>
  );
}

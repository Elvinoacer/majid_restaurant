/**
 * Minimal service worker for FCM background notifications (PRD §5.15).
 *
 * Receives `push` events from Firebase Cloud Messaging and displays them as
 * system notifications even when the customer's tab is closed. The payload
 * shape is `{ title, body, url?, icon? }` — sent from `src/lib/notifications/send.ts`.
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
  let payload = { title: "MajidOS", body: "" };
  try {
    if (event.data) {
      // FCM sends either JSON or plain text. Try JSON first, fall back to text.
      const text = event.data.text();
      try {
        const parsed = JSON.parse(text);
        // FCM wraps the actual payload in `data.notification` or `notification`.
        payload = parsed?.notification ?? parsed?.data ?? parsed;
      } catch {
        payload = { title: "MajidOS", body: text };
      }
    }
  } catch (e) {
    /* ignore parse errors — fall back to default payload */
  }

  const title = payload.title ?? "MajidOS";
  const options = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/logo.svg",
    badge: "/logo.svg",
    tag: payload.tag ?? "majidos",
    renotify: payload.renotify ?? false,
    data: { url: payload.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click on the notification focuses/opens the relevant tab and navigates
// to the URL attached to the payload.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          if (targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* navigate may fail on cross-origin clients — ignore */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })(),
  );
});

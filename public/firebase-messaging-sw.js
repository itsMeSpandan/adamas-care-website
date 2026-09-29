/* eslint-disable no-undef */
/**
 * firebase-messaging-sw.js — push notifications for the Grace Salon PWA.
 *
 * Handles raw Web Push events (FCM data-only messages), so no Firebase
 * config is needed in this file (NEXT_PUBLIC_* config lives in the page
 * bundle, which calls getToken() to register the subscription).
 *
 * Contract payload (data-only plus title/body):
 *   { type, bookingId, deepLink, title, body }
 *
 * Deliberately implements NO fetch/caching handlers — nothing under /api or
 * any authenticated page is ever cached (acceptance test A7).
 */

function showPush(data) {
  const title = data.title || "Grace Salon";
  const body = data.body || "You have a new update.";
  return self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      deepLink: data.deepLink || "/",
      type: data.type || "",
      bookingId: data.bookingId || "",
    },
  });
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        const json = event.data.json();
        // FCM may wrap data payloads as {data:{...}} or deliver them flat.
        data = json && typeof json === "object" ? json.data || json : {};
      } catch {
        try {
          data = { body: event.data.text() };
        } catch {
          data = {};
        }
      }
      await showPush(data);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const deepLink = (event.notification.data && event.notification.data.deepLink) || "/";
  let targetUrl;
  try {
    targetUrl = new URL(deepLink, self.location.origin).href;
  } catch {
    targetUrl = self.location.origin + "/";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab (navigating it to the deep link) if present.
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

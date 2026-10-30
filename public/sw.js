/* eslint-disable no-undef */
/**
 * sw.js — Adamas Care service worker (root scope).
 *
 * Job: keep the static shell usable offline. Nothing else.
 *
 * Caching contract (deliberate, do not relax):
 *   - PRECACHED at install: /offline.html and the two launcher icons, nothing
 *     more. No HTML page, no API response, no Next.js data payload.
 *   - Navigations: network-first. The network response is returned as-is and
 *     NEVER written to a cache, because every page in this app can render
 *     differently depending on the session cookie. Only when the network fails
 *     does /offline.html get served.
 *   - /_next/static/ and /icons/: cache-first. These are content-hashed,
 *     immutable build assets, so a stale hit cannot show stale user data.
 *   - NEVER_CACHE paths (below) are not intercepted at all: no respondWith, no
 *     read, no write. The request goes straight to the network, exactly as if
 *     this worker did not exist.
 *   - Non-GET requests are never intercepted.
 *   - Cross-origin requests are never intercepted.
 *
 * Push notifications: push and notificationclick handlers live in
 * /firebase-messaging-sw.js and are imported at the bottom of this file. Only
 * one worker can own a scope, and lib/firebase-client.ts registers its worker
 * at "/", so this file replaces that registration. The importScripts call is
 * what keeps FCM delivery working — do not remove it, and do not re-add a
 * second root-scope worker.
 */

const CACHE_NAME = "grace-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

/**
 * Paths that are session-dependent, write-only, or auth-gated. These are never
 * read from or written to a cache — see the contract above.
 */
const NEVER_CACHE_PATTERNS = [
  /^\/api(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/employee(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/account(?:\/|$)/,
  /^\/rewards(?:\/|$)/,
  /^\/booking(?:\/|$)/,
  /^\/verify-email(?:\/|$)/,
];

/** Immutable build assets / icons — safe to serve cache-first. */
const CACHE_FIRST_PREFIXES = ["/_next/static/", "/icons/"];

function isNeverCache(pathname) {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isCacheFirst(pathname) {
  return CACHE_FIRST_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Individually, so one 404 cannot abort the whole install and leave the
      // app with no worker at all.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("grace-static-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCache(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstThenOffline(request));
    return;
  }

  if (isCacheFirst(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

/**
 * Network-first, offline page as the only fallback. The successful response is
 * returned to the browser but intentionally not persisted.
 */
async function networkFirstThenOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ||
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

/** Cache-first for immutable static assets; only successful responses stored. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

// Push + notificationclick handlers, shared with the FCM worker. Must stay the
// last statement: one root-scope worker serves both push and offline.
importScripts("/firebase-messaging-sw.js");

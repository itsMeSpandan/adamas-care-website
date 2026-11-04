/**
 * tests/dashboard-background.test.ts — the admin-configurable dashboard picture.
 *
 * Two things matter here beyond "it saves": an uploaded background is arbitrary
 * user input rendered behind every member's dashboard, so the write path is
 * admin-only and validated; and the asset route is public but must stay
 * cacheable, which is why it does not live under /api (next.config.mjs sends
 * every /api response no-store).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/dashboard-background/route";
import { GET as GET_IMAGE } from "@/app/dashboard-background/image/route";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { COOKIE_NAMES } from "@/lib/constants";
import { MAX_BACKGROUND_FIELD_LENGTH } from "@/lib/image-field";

const SETTING_KEY = "dashboard_background";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const dataUrl = (bytes: number[]) =>
  `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;

function request(method: string, cookie?: string, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  // No Origin header, so isSameOrigin() lets a non-browser caller through.
  return new Request("http://localhost/api/dashboard-background", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("dashboard background", () => {
  let adminCookie: string;
  let userCookie: string;

  const stored = async () =>
    (await db.systemSetting.findUnique({ where: { key: SETTING_KEY } }))?.value ?? null;

  // This suite runs against whatever DATABASE_URL is configured, which for a
  // developer is often the database the salon itself uses. The key it clears
  // and finally deletes holds the live dashboard picture, and that value
  // exists nowhere else — so keep a copy and put it back when the suite ends.
  let previous: { value: string; description: string | null; updatedBy: string | null } | null =
    null;

  beforeAll(async () => {
    const existing = await db.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    previous = existing
      ? { value: existing.value, description: existing.description, updatedBy: existing.updatedBy }
      : null;

    await db.systemSetting.deleteMany({ where: { key: SETTING_KEY } });
    adminCookie = `${COOKIE_NAMES.session}=${await signToken(
      { userId: "bg-test-admin", role: "admin", email: "bg-test-admin@gracesalon.test" },
      "15m"
    )}`;
    userCookie = `${COOKIE_NAMES.session}=${await signToken(
      { userId: "bg-test-user", role: "user", email: "bg-test-user@gracesalon.test" },
      "15m"
    )}`;
  });

  afterAll(async () => {
    if (previous) {
      await db.systemSetting.upsert({
        where: { key: SETTING_KEY },
        create: { key: SETTING_KEY, ...previous },
        update: previous,
      });
      return;
    }
    await db.systemSetting.deleteMany({ where: { key: SETTING_KEY } });
  });

  it("starts with the default picture in use", async () => {
    const res = await GET(request("GET", adminCookie));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ custom: false, version: null });
    expect(await stored()).toBeNull();
  });

  it("refuses an anonymous reader", async () => {
    expect((await GET(request("GET"))).status).toBe(401);
  });

  it("refuses a member who tries to change it", async () => {
    const res = await PUT(request("PUT", userCookie, { image: dataUrl(PNG) }));
    expect(res.status).toBe(403);
    expect(await stored()).toBeNull();
  });

  it("refuses a member who tries to reset it", async () => {
    expect((await DELETE(request("DELETE", userCookie))).status).toBe(403);
  });

  it("refuses a script-bearing image", async () => {
    const res = await PUT(request("PUT", adminCookie, { image: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect(await stored()).toBeNull();
  });

  it("refuses a file that is not really the format it claims", async () => {
    const res = await PUT(
      request("PUT", adminCookie, { image: dataUrl(Array.from(Buffer.from("not an image"))) })
    );
    expect(res.status).toBe(400);
    expect(await stored()).toBeNull();
  });

  it("refuses a payload over the (larger) background cap", async () => {
    const huge = `data:image/png;base64,${Buffer.concat([
      Buffer.from(PNG),
      Buffer.alloc(MAX_BACKGROUND_FIELD_LENGTH, 0x41),
    ]).toString("base64")}`;
    expect(huge.length).toBeGreaterThan(MAX_BACKGROUND_FIELD_LENGTH);

    const res = await PUT(request("PUT", adminCookie, { image: huge }));
    expect(res.status).toBe(400);
    expect(await stored()).toBeNull();
  });

  it("refuses an empty body", async () => {
    expect((await PUT(request("PUT", adminCookie, {}))).status).toBe(400);
  });

  it("lets an admin set one, and reports a version to cache-bust it", async () => {
    const image = dataUrl(PNG);
    const res = await PUT(request("PUT", adminCookie, { image }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.custom).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(await stored()).toBe(image);

    const read = await GET(request("GET", adminCookie));
    expect(await read.json()).toEqual({ custom: true, version: body.version });
  });

  it("serves the bytes publicly, with a long-lived cache", async () => {
    const res = await GET_IMAGE(new Request("http://localhost/dashboard-background/image"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    // Not under /api, so next.config's no-store API rule cannot override this.
    expect(res.headers.get("cache-control")).not.toContain("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, PNG.length))).toEqual(PNG);
  });

  it("resets back to the default picture, and 404s the asset", async () => {
    const res = await DELETE(request("DELETE", adminCookie));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ custom: false, version: null });
    expect(await stored()).toBeNull();

    const asset = await GET_IMAGE(new Request("http://localhost/dashboard-background/image"));
    expect(asset.status).toBe(404);
  });

  it("records who changed it", async () => {
    // logAudit is intentionally fire-and-forget (an audit failure must not fail
    // the operation), so give the writes a moment to land.
    const readLogs = () =>
      db.auditLog.findMany({
        where: {
          entityId: SETTING_KEY,
          action: { in: ["dashboard_background_update", "dashboard_background_reset"] },
        },
        select: { action: true, adminId: true },
      });

    const wanted = ["dashboard_background_update", "dashboard_background_reset"];
    let logs = await readLogs();
    for (let i = 0; i < 20 && !wanted.every((a) => logs.some((l) => l.action === a)); i++) {
      await new Promise((r) => setTimeout(r, 25));
      logs = await readLogs();
    }

    expect(logs.map((l) => l.action)).toContain("dashboard_background_update");
    expect(logs.map((l) => l.action)).toContain("dashboard_background_reset");
    // The actor is taken from the session, never the request body. (Other rows for
    // this key can exist from real admin use of the same dev database.)
    expect(logs.some((l) => l.adminId === "bg-test-admin")).toBe(true);
  });
});

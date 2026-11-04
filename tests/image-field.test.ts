/**
 * tests/image-field.test.ts — what an uploaded photo is allowed to be.
 *
 * Employee photos (and profile avatars) are stored as strings on the row and
 * later rendered straight into <Image>, so the string is user input reaching a
 * tag. These tests pin down the boundary: only local paths, https addresses and
 * byte-verified raster data URLs get through, and the length cap holds.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  MAX_IMAGE_FIELD_LENGTH,
  checkPickedFile,
  generatedAvatarUrl,
  validateImageField,
} from "@/lib/image-field";
import { PUT } from "@/app/api/employees/[id]/route";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { COOKIE_NAMES } from "@/lib/constants";

const dataUrl = (mime: string, bytes: number[] | Uint8Array): string =>
  `data:image/${mime};base64,${Buffer.from(bytes).toString("base64")}`;

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00];
const WEBP = [
  0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56,
  0x50, 0x38, 0x20,
];

/** `expected` is the ok/kind pair a caller should get back. */
function expectKind(value: unknown, expected: string) {
  const result = validateImageField(value);
  expect(result.ok).toBe(true);
  expect(result.ok && result.kind).toBe(expected);
}

function expectRejected(value: unknown, match: RegExp) {
  const result = validateImageField(value);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toMatch(match);
}

describe("validateImageField — accepted values", () => {
  it("treats an absent field as 'leave the stored photo alone'", () => {
    expectKind(undefined, "unchanged");
  });

  it("treats null and empty string as 'remove the photo'", () => {
    expectKind(null, "clear");
    expectKind("", "clear");
  });

  it("accepts the local asset paths legacy rows already use", () => {
    expectKind("/images/photo-1472099645785-5658abf4ff4e", "value");
  });

  it("accepts an https address", () => {
    expectKind("https://ui-avatars.com/api/?name=Arjun", "value");
  });

  it("accepts a data URL whose bytes match the format it claims", () => {
    for (const [mime, bytes] of Object.entries({ jpeg: JPEG, png: PNG, gif: GIF, webp: WEBP })) {
      const result = validateImageField(dataUrl(mime, bytes));
      expect(result.ok, `${mime} should be accepted`).toBe(true);
      expect(result.ok && result.kind).toBe("value");
    }
  });

  it("accepts a photo just under the storage cap", () => {
    // A real 512px photo lands around 40 KB, so the cap has plenty of headroom.
    const filler = Buffer.alloc(200_000, 0x41);
    const value = dataUrl("png", Buffer.concat([Buffer.from(PNG), filler]));
    expect(value.length).toBeLessThan(MAX_IMAGE_FIELD_LENGTH);
    expectKind(value, "value");
  });
});

describe("validateImageField — rejected values", () => {
  it("refuses script-bearing schemes", () => {
    expectRejected("javascript:alert(1)", /Unsupported photo value/);
    expectRejected("data:text/html;base64,PHNjcmlwdD4=", /Unsupported photo value/);
    expectRejected("file:///etc/passwd", /Unsupported photo value/);
  });

  it("refuses remote SVG, which can carry script inside an <img>", () => {
    expectRejected(
      dataUrl("svg+xml", [0x3c, 0x73, 0x76, 0x67]),
      /Unsupported photo value/
    );
  });

  it("refuses a protocol-relative //host, which is not a local path", () => {
    expectRejected("//evil.example.com/photo.jpg", /Unsupported photo value/);
  });

  it("refuses plain http, which would be mixed content", () => {
    expectRejected("http://evil.example.com/photo.jpg", /Unsupported photo value/);
  });

  it("refuses bytes that do not match the declared image format", () => {
    expectRejected(
      dataUrl("png", Buffer.from("this is not an image")),
      /not a real PNG/
    );
  });

  it("refuses an oversized payload", () => {
    const value = dataUrl("png", Buffer.concat([Buffer.from(PNG), Buffer.alloc(500_000, 0x41)]));
    expect(value.length).toBeGreaterThan(MAX_IMAGE_FIELD_LENGTH);
    expectRejected(value, /too large/);
  });

  it("refuses a non-string", () => {
    expectRejected(42, /must be a string/);
    expectRejected({ url: "/images/a.png" }, /must be a string/);
  });
});

describe("checkPickedFile — the client-side pre-check", () => {
  const file = (name: string, type: string, size: number) => {
    const bytes = new Uint8Array(size);
    return new File([bytes], name, { type });
  };

  it("passes a normal photo through", () => {
    expect(checkPickedFile(file("a.jpg", "image/jpeg", 1024))).toBeNull();
  });

  it("rejects a non-image", () => {
    expect(checkPickedFile(file("notes.txt", "text/plain", 10))).toMatch(/choose an image/);
  });

  it("rejects SVG by name", () => {
    expect(checkPickedFile(file("logo.svg", "image/svg+xml", 10))).toMatch(/SVG/);
  });

  it("rejects an oversized file before it is ever decoded", () => {
    expect(checkPickedFile(file("huge.png", "image/png", 6 * 1024 * 1024))).toMatch(/5 MB/);
  });
});

describe("generatedAvatarUrl", () => {
  it("encodes the name so the placeholder is never an empty src", () => {
    expect(generatedAvatarUrl("Arjun Mehta")).toContain("name=Arjun%20Mehta");
    expect(generatedAvatarUrl("")).toContain("Team%20Member");
  });
});

// ─── Route wiring ───────────────────────────────────────────────────────────
// A throwaway employee row, created and removed by this file, so the check runs
// against the same code path the admin form hits.

describe("PUT /api/employees/[id] photo handling", () => {
  const EMPLOYEE_ID = "img-field-test-employee";
  const ORIGINAL = "/images/photo-1472099645785-5658abf4ff4e";

  let adminCookie: string;
  let userCookie: string;

  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  const request = (cookie: string | null, body: unknown) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (cookie) headers.cookie = cookie;
    // No Origin header: isSameOrigin() allows non-browser callers through.
    return new Request(`http://localhost/api/employees/${EMPLOYEE_ID}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  };

  beforeAll(async () => {
    await db.employee.deleteMany({ where: { id: EMPLOYEE_ID } });
    await db.employee.create({
      data: {
        id: EMPLOYEE_ID,
        name: "Image Field Test",
        email: "img-field-test@gracesalon.test",
        role: "Tester",
        bio: "Temporary row for the photo-upload tests.",
        imageUrl: ORIGINAL,
        yearsExperience: 1,
        rating: 0,
        reviewCount: 0,
      },
    });

    adminCookie = `${COOKIE_NAMES.session}=${await signToken(
      { userId: "img-field-test-admin", role: "admin", email: "img-field-admin@gracesalon.test" },
      "15m"
    )}`;
    userCookie = `${COOKIE_NAMES.session}=${await signToken(
      { userId: "img-field-test-user", role: "user", email: "img-field-user@gracesalon.test" },
      "15m"
    )}`;
  });

  afterAll(async () => {
    await db.employee.deleteMany({ where: { id: EMPLOYEE_ID } });
  });

  const storedImage = async () =>
    (await db.employee.findUnique({ where: { id: EMPLOYEE_ID } }))?.imageUrl;

  it("stores an uploaded photo", async () => {
    const uploading = dataUrl("jpeg", JPEG);
    const res = await PUT(request(adminCookie, { imageUrl: uploading }), context(EMPLOYEE_ID));

    expect(res.status).toBe(200);
    expect(await storedImage()).toBe(uploading);
  });

  it("rejects a bad photo with 400 and leaves the stored one untouched", async () => {
    const before = await storedImage();
    const res = await PUT(
      request(adminCookie, { imageUrl: "javascript:alert(1)" }),
      context(EMPLOYEE_ID)
    );

    expect(res.status).toBe(400);
    expect(await storedImage()).toBe(before);
  });

  it("rejects bytes that are not the format they claim", async () => {
    const before = await storedImage();
    const res = await PUT(
      request(adminCookie, { imageUrl: dataUrl("png", Buffer.from("not an image")) }),
      context(EMPLOYEE_ID)
    );

    expect(res.status).toBe(400);
    expect(await storedImage()).toBe(before);
  });

  it("falls back to an initials avatar when the photo is removed", async () => {
    const res = await PUT(request(adminCookie, { imageUrl: "" }), context(EMPLOYEE_ID));

    expect(res.status).toBe(200);
    const stored = await storedImage();
    expect(stored).toMatch(/^https:\/\/ui-avatars\.com\//);
    expect(stored).toContain("Image%20Field%20Test");
  });

  it("never stores an empty src", async () => {
    expect(await storedImage()).not.toBe("");
  });

  it("refuses a non-admin outright", async () => {
    const before = await storedImage();
    const res = await PUT(
      request(userCookie, { imageUrl: dataUrl("jpeg", JPEG) }),
      context(EMPLOYEE_ID)
    );

    expect(res.status).toBe(403);
    expect(await storedImage()).toBe(before);
  });
});

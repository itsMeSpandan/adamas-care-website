import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleOAuthSignIn } from "@/lib/oauth-auth";
import * as firebaseAdmin from "@/lib/firebase-admin";
import * as authLib from "@/lib/auth";
import { db } from "@/lib/db";
import { POST as registerHandler } from "@/app/api/auth/register/route";

// Mock authLib.setSessionCookies
vi.mock("@/lib/auth", () => ({
  setSessionCookies: vi.fn().mockResolvedValue(undefined),
}));

// Mock email delivery
vi.mock("@/lib/email", () => ({
  sendVerificationOtpEmail: vi.fn().mockResolvedValue(true),
}));

describe("OAuth Sign-In Handling (lib/auth-oauth.test.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default $transaction mock to pass db through to callback without hitting live network
    vi.spyOn(db, "$transaction").mockImplementation(async (cb: any) => cb(db));
    vi.spyOn(db.user, "create").mockResolvedValue({} as any);
  });

  describe("1. Provider verification & Token Claims", () => {
    it("rejects token issued by google.com when expectedProvider is microsoft.com", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "google-uid-123",
        email: "test@example.com",
        email_verified: true,
        firebase: { sign_in_provider: "google.com" },
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(400);
        expect(result.error).toContain("Invalid provider credential");
      }
    });

    it("rejects credential when no email is present in provider token", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-uid-123",
        email: null,
        email_verified: false,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(400);
        expect(result.error).toContain("does not provide an email address");
      }
      expect(db.user.create).not.toHaveBeenCalled();
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });

    it("resolves work/school/university accounts when email is provided via upn or preferred_username (e.g. stu.adamasuniversity.ac.in)", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-student-uid-999",
        email: null, // missing standard email
        upn: "stu123@stu.adamasuniversity.ac.in", // UPN present
        preferred_username: "stu123@stu.adamasuniversity.ac.in",
        email_verified: false,
        name: "Adamas Student",
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);
      vi.spyOn(db.user, "findFirst").mockResolvedValue(null);

      const createdStudentMock = {
        id: "student-user-1",
        name: "Adamas Student",
        email: "stu123@stu.adamasuniversity.ac.in",
        role: "user",
        emailVerified: false,
        password: "$2b$12$randombcryptlock",
      };

      vi.spyOn(db.user, "create").mockResolvedValue(createdStudentMock as any);
      vi.spyOn((db as any).authIdentity, "create").mockResolvedValue({ id: "ident-student-1" });

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toBe(true);
        expect(result.user.email).toBe("stu123@stu.adamasuniversity.ac.in");
        expect(result.user.emailVerified).toBe(false);
      }

      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "stu123@stu.adamasuniversity.ac.in",
            emailVerified: false,
            role: "user",
          }),
        })
      );

      expect((db as any).authIdentity.create).toHaveBeenCalledWith({
        data: {
          userId: "student-user-1",
          provider: "microsoft.com",
          providerUid: "ms-student-uid-999",
        },
      });

      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "student-user-1",
        role: "user",
        email: "stu123@stu.adamasuniversity.ac.in",
      });
    });

    it("handles missing email gracefully without creating an account or crashing", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-no-email-uid",
        email: null,
        upn: "not-an-email",
        preferred_username: "invalid_format",
        email_verified: false,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);
      vi.spyOn(db.user, "findFirst").mockResolvedValue(null);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(400);
        expect(result.error).toContain("does not provide an email address");
      }

      expect(db.user.create).not.toHaveBeenCalled();
      expect((db as any).authIdentity.create).not.toHaveBeenCalled();
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });
  });

  describe("2. Microsoft Sign-In: Existing email blocked & Admin/Employee lockout", () => {
    it("BLOCKS Microsoft sign-in if an account with that email already exists (any provider/role)", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-new-uid-attacker",
        email: "existing@example.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      // Identity not found
      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);

      // Existing user found by email
      vi.spyOn(db.user, "findFirst").mockResolvedValue({
        id: "existing-user-id",
        email: "existing@example.com",
        role: "user",
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toBe(
          "An account with this email already exists. Please sign in with your original method (Google, or email and password)."
        );
      }
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });

    it("NEVER links or logs into an admin or employee account via Microsoft (by email)", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-uid-admin-target",
        email: "admin@adamascare.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);
      vi.spyOn(db.user, "findFirst").mockResolvedValue({
        id: "admin-id",
        email: "admin@adamascare.com",
        role: "admin",
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toBe(
          "An account with this email already exists. Please sign in with your original method (Google, or email and password)."
        );
      }
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });

    it("NEVER allows admin or employee to sign in even if an identity row exists", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-linked-admin-uid",
        email: "admin@adamascare.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue({
        id: "ident-admin",
        userId: "admin-id",
        provider: "microsoft.com",
        providerUid: "ms-linked-admin-uid",
        user: {
          id: "admin-id",
          email: "admin@adamascare.com",
          role: "admin",
        },
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toContain("Admin and employee accounts cannot sign in with Microsoft");
      }
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });
  });

  describe("3. Microsoft Sign-In: New user creation (emailVerified=false) & session issuance", () => {
    it("creates a customer account with emailVerified=false, locked password, and signs in immediately", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-new-user-uid",
        email: "brandnew@outlook.com",
        email_verified: false,
        name: "New Microsoft User",
        picture: "https://photo.example.com/ms.jpg",
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);
      vi.spyOn(db.user, "findFirst").mockResolvedValue(null);

      const createdUserMock = {
        id: "new-user-123",
        name: "New Microsoft User",
        email: "brandnew@outlook.com",
        role: "user",
        emailVerified: false,
        password: "$2b$12$randombcryptlock",
      };

      vi.spyOn(db.user, "create").mockResolvedValue(createdUserMock as any);
      vi.spyOn((db as any).authIdentity, "create").mockResolvedValue({ id: "ident-created-1" });

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toBe(true);
        expect(result.user.id).toBe("new-user-123");
        expect(result.user.emailVerified).toBe(false);
        expect(result.user).not.toHaveProperty("password");
      }

      // Assert user was created with emailVerified: false
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "brandnew@outlook.com",
            emailVerified: false,
            role: "user",
          }),
        })
      );

      // Assert Microsoft identity was stored
      expect((db as any).authIdentity.create).toHaveBeenCalledWith({
        data: {
          userId: "new-user-123",
          provider: "microsoft.com",
          providerUid: "ms-new-user-uid",
        },
      });

      // Assert session cookies were issued
      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "new-user-123",
        role: "user",
        email: "brandnew@outlook.com",
      });
    });

    it("on later logins, matches by provider+uid first and logs in immediately", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-returning-uid",
        email: "returning@outlook.com",
        email_verified: false,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue({
        id: "ident-existing",
        userId: "returning-user-id",
        provider: "microsoft.com",
        providerUid: "ms-returning-uid",
        user: {
          id: "returning-user-id",
          email: "returning@outlook.com",
          role: "user",
          emailVerified: false,
        },
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toBe(false);
        expect(result.user.id).toBe("returning-user-id");
      }

      // No lookup by email and no user creation
      expect(db.user.findFirst).not.toHaveBeenCalled();
      expect(db.user.create).not.toHaveBeenCalled();

      // Session cookies issued
      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "returning-user-id",
        role: "user",
        email: "returning@outlook.com",
      });
    });
  });

  describe("4. Safety Net: Google Takeover Cleanup of Unverified Microsoft Stubs", () => {
    it("deletes Microsoft identity, sets emailVerified=true, and links Google when verified Google user signs in", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "google-real-owner-uid",
        email: "victim@example.com",
        email_verified: true, // Google verified
        name: "Real Owner",
        firebase: { sign_in_provider: "google.com" },
      } as any);

      // Identity for Google not found yet
      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);

      // Existing user found by email, but created via Microsoft with emailVerified: false
      const unverifiedStubUser = {
        id: "stub-user-id",
        email: "victim@example.com",
        role: "user",
        emailVerified: false, // unverified!
      };
      vi.spyOn(db.user, "findFirst").mockResolvedValue(unverifiedStubUser as any);

      // Mock cleanup and update
      vi.spyOn((db as any).authIdentity, "deleteMany").mockResolvedValue({ count: 1 });
      vi.spyOn(db.user, "update").mockResolvedValue({
        ...unverifiedStubUser,
        emailVerified: true,
      } as any);
      vi.spyOn((db as any).authIdentity, "create").mockResolvedValue({ id: "new-google-ident" });

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "google.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("stub-user-id");
        expect(result.user.emailVerified).toBe(true);
      }

      // Assert Microsoft identity was deleted
      expect((db as any).authIdentity.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "stub-user-id",
          provider: "microsoft.com",
        },
      });

      // Assert user was marked verified
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "stub-user-id" },
        data: { emailVerified: true },
      });

      // Assert Google identity was created
      expect((db as any).authIdentity.create).toHaveBeenCalledWith({
        data: {
          userId: "stub-user-id",
          provider: "google.com",
          providerUid: "google-real-owner-uid",
        },
      });

      // Session cookies issued
      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "stub-user-id",
        role: "user",
        email: "victim@example.com",
      });
    });
  });

  describe("5. Safety Net: Email/Password Registration Reclaims Microsoft Stub", () => {
    it("allows real owner to sign up with password, deleting Microsoft identity and sending OTP", async () => {
      const stubUser = {
        id: "stub-user-ms-id",
        email: "realowner@example.com",
        role: "user",
        emailVerified: false,
        whatsappNumber: null,
        identities: [{ provider: "microsoft.com" }],
      };

      vi.spyOn(db.user, "findFirst").mockResolvedValue(stubUser as any);
      vi.spyOn((db as any).authIdentity, "deleteMany").mockResolvedValue({ count: 1 });
      vi.spyOn(db.user, "update").mockResolvedValue({
        ...stubUser,
        name: "Real Owner",
        emailVerified: false,
      } as any);
      vi.spyOn(db.emailVerificationToken, "create").mockResolvedValue({ id: "token-1" } as any);

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Real Owner",
          email: "realowner@example.com",
          password: "SuperSecretPassword123!",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe("realowner@example.com");

      // Assert Microsoft identity was purged
      expect((db as any).authIdentity.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "stub-user-ms-id",
          provider: "microsoft.com",
        },
      });

      // Assert password updated & session issued
      expect(db.user.update).toHaveBeenCalled();
      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "stub-user-ms-id",
        role: "user",
        email: "realowner@example.com",
      });
    });

    it("rejects registration with 409 if existing user is already verified or normal user", async () => {
      const verifiedUser = {
        id: "verified-user-id",
        email: "verified@example.com",
        role: "user",
        emailVerified: true,
        identities: [],
      };

      vi.spyOn(db.user, "findFirst").mockResolvedValue(verifiedUser as any);

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Another Person",
          email: "verified@example.com",
          password: "SuperSecretPassword123!",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("An account with this email already exists");
    });
  });
});

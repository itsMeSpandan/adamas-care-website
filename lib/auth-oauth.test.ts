import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleOAuthSignIn } from "@/lib/oauth-auth";
import * as firebaseAdmin from "@/lib/firebase-admin";
import * as authLib from "@/lib/auth";
import { db } from "@/lib/db";

// Mock authLib.setSessionCookies
vi.mock("@/lib/auth", () => ({
  setSessionCookies: vi.fn().mockResolvedValue(undefined),
}));

describe("OAuth Sign-In Handling (lib/auth-oauth.test.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        expect(result.error).toContain("Your Microsoft account has no email address");
      }
    });
  });

  describe("2. Unverified Email Handling & Account Takeover Prevention", () => {
    it("NEVER links unverified email to an existing account", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-attacker-uid",
        email: "victim@example.com",
        email_verified: false, // unverified!
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      // Identity not found
      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);

      // Existing user found by email
      vi.spyOn(db.user, "findFirst").mockResolvedValue({
        id: "victim-user-id",
        email: "victim@example.com",
        role: "user",
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toContain("An account with this email already exists");
        expect(result.error).toContain("verify your email address with Microsoft");
      }
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });

    it("rejects account creation if email is unverified", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-new-unverified",
        email: "newperson@example.com",
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
        expect(result.status).toBe(403);
        expect(result.error).toContain("email is not verified");
      }
    });
  });

  describe("3. Role Protection: Admin and Employee accounts cannot sign in via OAuth", () => {
    it("rejects sign-in if existing account is role admin", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-uid-admin",
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
          "Admin and employee accounts cannot sign in with Microsoft. Please use your email and password."
        );
      }
      expect(authLib.setSessionCookies).not.toHaveBeenCalled();
    });

    it("rejects sign-in if existing account is role employee", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-uid-emp",
        email: "specialist@adamascare.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);
      vi.spyOn(db.user, "findFirst").mockResolvedValue({
        id: "emp-id",
        email: "specialist@adamascare.com",
        role: "employee",
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toBe(
          "Admin and employee accounts cannot sign in with Microsoft. Please use your email and password."
        );
      }
    });

    it("rejects sign-in if identity is already linked to an admin account", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "existing-linked-uid",
        email: "admin@adamascare.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue({
        id: "ident-1",
        userId: "admin-id",
        provider: "microsoft.com",
        providerUid: "existing-linked-uid",
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
    });
  });

  describe("4. First-time Linking & Identity Creation", () => {
    it("authenticates directly via AuthIdentity if already linked", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-known-uid",
        email: "customer@example.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue({
        id: "ident-2",
        userId: "cust-123",
        provider: "microsoft.com",
        providerUid: "ms-known-uid",
        user: {
          id: "cust-123",
          email: "customer@example.com",
          role: "user",
          name: "Customer",
        },
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("cust-123");
        expect(result.created).toBe(false);
      }
      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "cust-123",
        role: "user",
        email: "customer@example.com",
      });
    });

    it("links verified email to existing customer and creates AuthIdentity", async () => {
      vi.spyOn(firebaseAdmin, "verifyGoogleIdToken").mockResolvedValue({
        uid: "ms-new-link-uid",
        email: "existingcustomer@example.com",
        email_verified: true,
        firebase: { sign_in_provider: "microsoft.com" },
      } as any);

      vi.spyOn((db as any).authIdentity, "findUnique").mockResolvedValue(null);
      vi.spyOn((db as any).authIdentity, "create").mockResolvedValue({ id: "new-ident-id" });

      vi.spyOn(db.user, "findFirst").mockResolvedValue({
        id: "cust-456",
        email: "existingcustomer@example.com",
        role: "user",
        name: "Existing Customer",
      } as any);

      const result = await handleOAuthSignIn({
        credential: "mock-token",
        expectedProvider: "microsoft.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("cust-456");
        expect(result.created).toBe(false);
      }
      expect((db as any).authIdentity.create).toHaveBeenCalledWith({
        data: {
          userId: "cust-456",
          provider: "microsoft.com",
          providerUid: "ms-new-link-uid",
        },
      });
      expect(authLib.setSessionCookies).toHaveBeenCalledWith({
        userId: "cust-456",
        role: "user",
        email: "existingcustomer@example.com",
      });
    });
  });
});

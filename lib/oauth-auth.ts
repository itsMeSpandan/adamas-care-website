import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { setSessionCookies } from "@/lib/auth";
import {
  isFirebaseConfigured,
  verifyGoogleIdToken,
} from "@/lib/firebase-admin";
import crypto from "crypto";

export interface HandleOAuthSignInParams {
  credential: string;
  expectedProvider: "google.com" | "microsoft.com";
}

export type HandleOAuthSignInResult =
  | { success: true; user: any; created: boolean }
  | { success: false; status: number; error: string };

const PROVIDER_NAMES: Record<string, string> = {
  "google.com": "Google",
  "microsoft.com": "Microsoft",
};

/**
 * Common server verification and user matching/creation for OAuth providers
 * (Google and Microsoft).
 *
 * Rules:
 *   1. Identity lookup first: Authenticates by (provider + providerUid) via AuthIdentity.
 *      - Admin & employee accounts cannot sign in via OAuth.
 *   2. Existing email handling:
 *      - Microsoft: If an account with this email already exists (any provider/role),
 *        never link and never log in. Return clear message directing to original method.
 *      - Google: Links to existing customer account only if Google verified the email.
 *        If the existing account was created unverified via Microsoft (emailVerified: false),
 *        deletes the Microsoft identity and sets emailVerified = true.
 *   3. New account creation:
 *      - Microsoft: Creates account with emailVerified = false, locked password, role "user",
 *        and records the Microsoft AuthIdentity.
 *      - Google: Creates account with emailVerified = true, locked password, role "user",
 *        and records the Google AuthIdentity.
 *   4. Zero tokens or PII logged.
 */
export async function handleOAuthSignIn({
  credential,
  expectedProvider,
}: HandleOAuthSignInParams): Promise<HandleOAuthSignInResult> {
  const providerLabel = PROVIDER_NAMES[expectedProvider] || expectedProvider;

  if (typeof isFirebaseConfigured === "function" && !isFirebaseConfigured()) {
    return {
      success: false,
      status: 503,
      error: `${providerLabel} sign-in is not configured on the server.`,
    };
  }

  let decoded: any = null;
  try {
    if (typeof verifyGoogleIdToken === "function") {
      decoded = await verifyGoogleIdToken(credential);
    }
  } catch {
    decoded = null;
  }

  if (!decoded) {
    return {
      success: false,
      status: 401,
      error: `${providerLabel} sign-in failed. Please try again.`,
    };
  }

  // Enforce provider matching when provider claim is explicitly populated
  if (
    decoded.firebase?.sign_in_provider &&
    decoded.firebase.sign_in_provider !== expectedProvider
  ) {
    return {
      success: false,
      status: 400,
      error: "Invalid provider credential.",
    };
  }

  // Resolve email: check standard email claim first, then fallback to preferred_username,
  // upn, or identities.email array for organizational accounts (e.g. stu.adamasuniversity.ac.in).
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let resolvedEmail: string | undefined = undefined;

  if (typeof decoded.email === "string" && emailRegex.test(decoded.email.trim())) {
    resolvedEmail = decoded.email.trim();
  } else if (
    typeof decoded.preferred_username === "string" &&
    emailRegex.test(decoded.preferred_username.trim())
  ) {
    resolvedEmail = decoded.preferred_username.trim();
  } else if (
    typeof decoded.upn === "string" &&
    emailRegex.test(decoded.upn.trim())
  ) {
    resolvedEmail = decoded.upn.trim();
  } else if (
    Array.isArray(decoded.firebase?.identities?.email) &&
    typeof decoded.firebase.identities.email[0] === "string" &&
    emailRegex.test(decoded.firebase.identities.email[0].trim())
  ) {
    resolvedEmail = decoded.firebase.identities.email[0].trim();
  }

  if (!resolvedEmail) {
    return {
      success: false,
      status: 400,
      error: `Your ${providerLabel} account does not provide an email address. Please make sure your ${providerLabel} account has an email configured, or sign in using Google or email and password.`,
    };
  }

  const email = resolvedEmail.toLowerCase();

  // Google accounts must always have email_verified === true
  if (expectedProvider === "google.com" && decoded.email_verified !== true) {
    return {
      success: false,
      status: 403,
      error: "Your Google account email is not verified.",
    };
  }

  const providerUid = decoded.uid;

  // 1. Look up existing identity by provider + providerUid
  let existingIdentity: any = null;
  if ((db as any).authIdentity?.findUnique) {
    try {
      existingIdentity = await (db as any).authIdentity.findUnique({
        where: {
          provider_providerUid: {
            provider: expectedProvider,
            providerUid,
          },
        },
        include: { user: true },
      });
    } catch (err) {
      console.warn("[OAuth] authIdentity lookup warning:", err);
    }
  }

  if (existingIdentity?.user) {
    const user = existingIdentity.user;
    // Rule: Never allow staff/admin accounts to sign in via OAuth
    if (user.role === "admin" || user.role === "employee") {
      return {
        success: false,
        status: 403,
        error: `Admin and employee accounts cannot sign in with ${providerLabel}. Please use your email and password.`,
      };
    }

    await setSessionCookies({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword, created: false };
  }

  // 2. Identity not found — check if an account with this email already exists
  const existingUser = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { identities: true },
  });

  if (existingUser) {
    // Rule 1: Microsoft NEVER links or logs into an existing account (any provider or role)
    if (expectedProvider === "microsoft.com") {
      return {
        success: false,
        status: 403,
        error:
          "An account with this email already exists. Please sign in with your original method (Google, or email and password).",
      };
    }

    // Google flow: Staff accounts are strictly forbidden from OAuth takeover
    if (existingUser.role === "admin" || existingUser.role === "employee") {
      return {
        success: false,
        status: 403,
        error: `Admin and employee accounts cannot sign in with ${providerLabel}. Please use your email and password.`,
      };
    }

    // Rule 3: Safety net — if account was created via Microsoft with emailVerified=false,
    // Google with verified email claims the account, removes the Microsoft identity, and verifies email.
    if (existingUser.emailVerified === false) {
      const cleanupAndLink = async (txOrDb: any) => {
        if (txOrDb.authIdentity?.deleteMany) {
          await txOrDb.authIdentity.deleteMany({
            where: {
              userId: existingUser.id,
              provider: "microsoft.com",
            },
          });
        }

        const updatedUser = await txOrDb.user.update({
          where: { id: existingUser.id },
          data: { emailVerified: true },
        });

        if (txOrDb.authIdentity?.create) {
          try {
            await txOrDb.authIdentity.create({
              data: {
                userId: existingUser.id,
                provider: "google.com",
                providerUid,
              },
            });
          } catch (err) {
            console.warn("[OAuth] Failed to record google authIdentity:", err);
          }
        }

        return updatedUser;
      };

      let updated: any;
      if (typeof (db as any).$transaction === "function") {
        updated = await (db as any).$transaction(cleanupAndLink);
      } else {
        updated = await cleanupAndLink(db);
      }

      await setSessionCookies({
        userId: updated.id,
        role: updated.role,
        email: updated.email,
      });

      const { password: _, ...userWithoutPassword } = updated;
      return { success: true, user: userWithoutPassword, created: false };
    }

    // Standard Google linking to existing verified customer account
    if ((db as any).authIdentity?.create) {
      try {
        await (db as any).authIdentity.create({
          data: {
            userId: existingUser.id,
            provider: "google.com",
            providerUid,
          },
        });
      } catch (err) {
        console.warn("[OAuth] Failed to record authIdentity link:", err);
      }
    }

    await setSessionCookies({
      userId: existingUser.id,
      role: existingUser.role,
      email: existingUser.email,
    });

    const { password: _, ...userWithoutPassword } = existingUser;
    return { success: true, user: userWithoutPassword, created: false };
  }

  // 3. No account exists — create a new user
  // For Microsoft: emailVerified is false
  // For Google: emailVerified is true
  const isVerified = expectedProvider === "google.com";

  const name = decoded.name?.trim() || email.split("@")[0];
  const randomPassword = crypto.randomBytes(48).toString("base64url");
  const hashedPassword = await hashPassword(randomPassword);

  let newUser: any;
  const createUserAndIdentity = async (client: any) => {
    const created = await client.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
        gender: null,
        avatarUrl:
          decoded.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e8ddd3&color=7c6e5a`,
        emailVerified: isVerified,
      },
    });

    if (client.authIdentity?.create) {
      try {
        await client.authIdentity.create({
          data: {
            userId: created.id,
            provider: expectedProvider,
            providerUid,
          },
        });
      } catch (idErr) {
        console.warn("[OAuth] Failed to record initial authIdentity:", idErr);
      }
    }

    return created;
  };

  try {
    if (typeof (db as any).$transaction === "function") {
      newUser = await (db as any).$transaction(createUserAndIdentity);
    } else {
      newUser = await createUserAndIdentity(db);
    }
  } catch (err) {
    const isUniqueViolation =
      err instanceof Error && "code" in err && (err as { code: string }).code === "P2002";
    if (isUniqueViolation) {
      const racedUser = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (racedUser) {
        newUser = racedUser;
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  await setSessionCookies({
    userId: newUser.id,
    role: newUser.role,
    email: newUser.email,
  });

  const { password: _, ...userWithoutPassword } = newUser;
  return { success: true, user: userWithoutPassword, created: true };
}

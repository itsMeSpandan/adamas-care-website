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
 *   1. Authenticates by provider + providerUid via AuthIdentity first.
 *   2. Only links to an existing user by email if decoded.email_verified === true.
 *   3. If unverified email matches an existing account, rejects with an explicit message.
 *   4. Rejects any OAuth sign-in matching an admin or employee account (staff must use password).
 *   5. Newly created accounts are always role "user" with an unguessable bcrypt password.
 *   6. Never logs tokens or PII.
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

  // Temporary server diagnostic for Microsoft (verified flag and provider only — no PII)
  if (expectedProvider === "microsoft.com") {
    console.log("[MicrosoftAuth:Debug]", {
      emailVerified: decoded.email_verified,
      provider: decoded.firebase?.sign_in_provider,
    });
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

  const email = decoded.email?.trim().toLowerCase();
  if (!email) {
    return {
      success: false,
      status: 400,
      error: `Your ${providerLabel} account has no email address.`,
    };
  }

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
  });

  if (existingUser) {
    // Rule: Never link by unverified email
    if (decoded.email_verified !== true) {
      return {
        success: false,
        status: 403,
        error:
          "An account with this email already exists. Please sign in with your original method, or verify your email address with Microsoft.",
      };
    }

    // Rule: Never allow OAuth to take over admin/employee accounts
    if (existingUser.role === "admin" || existingUser.role === "employee") {
      return {
        success: false,
        status: 403,
        error: `Admin and employee accounts cannot sign in with ${providerLabel}. Please use your email and password.`,
      };
    }

    // Link identity to existing customer account
    if ((db as any).authIdentity?.create) {
      try {
        await (db as any).authIdentity.create({
          data: {
            userId: existingUser.id,
            provider: expectedProvider,
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
  if (decoded.email_verified !== true) {
    return {
      success: false,
      status: 403,
      error: `Your ${providerLabel} account email is not verified. Please verify your email with ${providerLabel} to continue, or register with email and password.`,
    };
  }

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
        emailVerified: true,
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

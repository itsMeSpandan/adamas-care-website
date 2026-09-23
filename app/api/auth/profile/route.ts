import { NextResponse } from "next/server";
import { updateUser, findUserById, findUserByEmail } from "@/lib/queries";
import { hashPassword, comparePassword } from "@/lib/crypto";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";



export const dynamic = "force-dynamic";

export const PUT = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    // IMPORTANT: the target user is always derived from the authenticated session,
    // never from a client-supplied `userId` (prevents IDOR / account takeover).
    const { name, email, avatarUrl, whatsappNumber, currentPassword, newPassword } = body;

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If changing email, check uniqueness
    if (email && email !== user.email) {
      const existing = await findUserByEmail(email);
      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    }

    // If changing password, verify current with bcrypt
    if (newPassword) {
      if (!currentPassword || !(await comparePassword(currentPassword, user.password))) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (whatsappNumber !== undefined) {
      // Validate WhatsApp number format
      if (whatsappNumber && whatsappNumber.trim().length > 0) {
        const cleanPhone = whatsappNumber.replace(/[^0-9+]/g, "");
        if (!cleanPhone.match(/^\+?[0-9]{10,15}$/)) {
          return NextResponse.json(
            { error: "Please enter a valid WhatsApp number" },
            { status: 400 }
          );
        }
        // Check if another user already has this number
        const { db } = await import("@/lib/db");
        const existingPhone = await db.user.findFirst({
          where: { whatsappNumber: cleanPhone, id: { not: session.userId } },
        });
        if (existingPhone) {
          return NextResponse.json(
            { error: "This WhatsApp number is already associated with another account" },
            { status: 409 }
          );
        }
        updateData.whatsappNumber = cleanPhone;
      } else {
        updateData.whatsappNumber = null;
      }
    }
    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
      updateData.mustChangePassword = false;
    }

    const updated = await updateUser(session.userId, updateData);

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updated;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
});

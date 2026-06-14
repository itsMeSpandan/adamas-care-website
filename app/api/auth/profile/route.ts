import { NextResponse } from "next/server";
import { updateUser, findUserById, findUserByEmail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, email, avatarUrl, currentPassword, newPassword } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await findUserById(userId);
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

    // If changing password, verify current
    if (newPassword) {
      if (!currentPassword || currentPassword !== user.password) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
    }

    const updateData: {
      name?: string;
      email?: string;
      avatarUrl?: string;
      password?: string;
    } = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (newPassword) updateData.password = newPassword;

    const updated = await updateUser(userId, updateData);

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
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// GET — List all rewards (admin)
export const GET = requireRole("admin", async () => {
  try {
    const rewards = await db.loyaltyReward.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        service: { select: { id: true, name: true } },
        _count: { select: { redemptions: true } },
      },
    });
    return NextResponse.json({ rewards });
  } catch (error) {
    console.error("Failed to fetch rewards:", error);
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
});

// POST — Create a reward
export const POST = requireRole("admin", async (request: Request) => {
  try {
    const body = await request.json();
    const { name, description, pointsCost, discountType, discountValue, serviceId, stock } = body;

    if (!name || !description || !pointsCost || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["percent", "fixed", "free_service"].includes(discountType)) {
      return NextResponse.json({ error: "Invalid discountType" }, { status: 400 });
    }

    if (pointsCost < 1) {
      return NextResponse.json({ error: "pointsCost must be at least 1" }, { status: 400 });
    }

    const reward = await db.loyaltyReward.create({
      data: {
        name,
        description,
        pointsCost: Math.floor(pointsCost),
        discountType,
        discountValue,
        serviceId: serviceId || null,
        stock: stock !== undefined ? stock : null,
      },
    });

    return NextResponse.json({ reward }, { status: 201 });
  } catch (error) {
    console.error("Failed to create reward:", error);
    return NextResponse.json({ error: "Failed to create reward" }, { status: 500 });
  }
});

// PATCH — Update a reward
export const PATCH = requireRole("admin", async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.pointsCost !== undefined) data.pointsCost = Math.floor(body.pointsCost);
    if (body.discountType !== undefined) data.discountType = body.discountType;
    if (body.discountValue !== undefined) data.discountValue = body.discountValue;
    if (body.serviceId !== undefined) data.serviceId = body.serviceId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.stock !== undefined) data.stock = body.stock;

    const reward = await db.loyaltyReward.update({ where: { id }, data });
    return NextResponse.json({ reward });
  } catch (error) {
    console.error("Failed to update reward:", error);
    return NextResponse.json({ error: "Failed to update reward" }, { status: 500 });
  }
});

// DELETE — Soft-delete a reward (set isActive: false)
export const DELETE = requireRole("admin", async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    // Soft-delete: set isActive to false instead of hard delete
    const reward = await db.loyaltyReward.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, reward });
  } catch (error) {
    console.error("Failed to delete reward:", error);
    return NextResponse.json({ error: "Failed to delete reward" }, { status: 500 });
  }
});

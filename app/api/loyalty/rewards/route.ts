import { NextResponse } from "next/server";
import { getActiveRewards } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId") || undefined;

    const rewards = await getActiveRewards(serviceId);
    return NextResponse.json({ rewards });
  } catch (error) {
    console.error("Failed to fetch rewards:", error);
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}

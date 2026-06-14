import { NextResponse } from "next/server";
import { getServices, createService } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = await getServices();
    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, description, longDescription, durationMinutes, price, imageUrl, featured, employeeIds } = body;

    if (!name || !category || !description || durationMinutes === undefined || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, description, durationMinutes, price" },
        { status: 400 }
      );
    }

    // Generate a unique ID using timestamp + random
    const id = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const service = await createService({
      id,
      name,
      category,
      description,
      longDescription: longDescription || description,
      durationMinutes,
      price,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
      featured: featured ?? false,
      employeeIds: employeeIds || [],
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/app/models/Product";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");
  const category = searchParams.get("category");

  await connectDB();

  const filter: any = { ownerId: user.userId };
  if (isActive !== null) filter.isActive = isActive === "true";
  if (category) filter.category = category;

  const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    description,
    sku,
    category,
    price,
    cost,
    currency,
    unit,
    stock,
    isActive,
    taxRate,
    image,
  } = body;

  if (!name || price === undefined || price === null) {
    return NextResponse.json(
      { error: "Name and price are required" },
      { status: 400 }
    );
  }

  await connectDB();

  // Check if SKU already exists
  if (sku) {
    const existing = await Product.findOne({ sku });
    if (existing) {
      return NextResponse.json(
        { error: "Product with this SKU already exists" },
        { status: 400 }
      );
    }
  }

  const product = await Product.create({
    ownerId: user.userId,
    name,
    description,
    sku,
    category,
    price,
    cost,
    currency: currency || "USD",
    unit: unit || "unit",
    stock: stock || 0,
    isActive: isActive !== undefined ? isActive : true,
    taxRate: taxRate || 0,
    image,
  });

  return NextResponse.json(product, { status: 201 });
}

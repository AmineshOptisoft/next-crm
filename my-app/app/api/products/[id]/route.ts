import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/app/models/Product";
import { getCurrentUser } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

async function resolveParams(context: Context) {
  const maybe = (context as any).params;
  const resolved =
    maybe && typeof maybe.then === "function" ? await maybe : maybe;
  return resolved as { id: string };
}

export async function GET(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("products", "view");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const product = await Product.findOne({
    _id: id,
    companyId: user.companyId,
  }).lean();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("products", "edit");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);
  const body = await req.json();
  const { sku } = body;

  await connectDB();

  // Check if SKU already exists for another product in this company
  if (sku) {
    const existing = await Product.findOne({
      sku,
      companyId: user.companyId,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Product with this SKU already exists" },
        { status: 400 }
      );
    }
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
    body,
    { new: true, runValidators: true }
  ).lean();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, context: Context) {
  const permCheck = await checkPermission("products", "delete");
  if (!permCheck.authorized) {
    return permCheck.response;
  }
  const user = permCheck.user;

  if (!user.companyId) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const { id } = await resolveParams(context);

  await connectDB();
  const deleted = await Product.findOneAndDelete({
    _id: id,
    companyId: user.companyId,
  }).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Product deleted successfully" });
}

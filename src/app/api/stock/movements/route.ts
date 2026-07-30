import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/stock/movements?productId=&type=IN|OUT&page=&limit=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("productId");
  const type = searchParams.get("type") as "IN" | "OUT" | null;
  const userId = searchParams.get("userId");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "30")));
  const skip = (page - 1) * limit;

  const where = {
    ...(productId && { productId }),
    ...(type && { type }),
    ...(userId && { userId }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return NextResponse.json({
    movements,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/stock/movements
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { productId, type, quantity, note } = body;

  if (!productId || !type || !quantity) {
    return NextResponse.json({ error: "Missing required fields: productId, type, quantity" }, { status: 400 });
  }
  if (!["IN", "OUT"].includes(type)) {
    return NextResponse.json({ error: "type must be IN or OUT" }, { status: 400 });
  }
  if (quantity <= 0) {
    return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (type === "OUT" && product.quantity < quantity) {
    return NextResponse.json(
      { error: `Insufficient stock. Available: ${product.quantity}` },
      { status: 400 }
    );
  }

  const newQuantity = type === "IN" ? product.quantity + quantity : product.quantity - quantity;

  // Transaction: create movement + update product quantity
  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: { productId, type, quantity, note: note ?? null, userId: user.id },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { quantity: newQuantity },
    }),
  ]);

  // Auto-create low stock alert if quantity dropped below minimum
  if (type === "OUT" && newQuantity <= product.minQuantity) {
    const recentAlert = await prisma.alert.findFirst({
      where: {
        productId,
        type: "LOW_STOCK",
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!recentAlert) {
      await prisma.alert.create({
        data: {
          type: "LOW_STOCK",
          message: `Low stock: ${product.name} has ${newQuantity} units remaining (min: ${product.minQuantity})`,
          productId,
        },
      });
    }
  }

  return NextResponse.json({ movement }, { status: 201 });
}

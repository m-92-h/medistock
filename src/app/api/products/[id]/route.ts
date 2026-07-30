import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: { select: { id: true, name: true, email: true, phone: true } },
      stockMovements: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      alerts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({ product });
}

// PATCH /api/products/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json();
  const { name, sku, description, unit, minQuantity, price, expiryDate, categoryId, supplierId } = body;

  // If SKU is changing, check it's not taken
  if (sku && sku !== existing.sku) {
    const skuConflict = await prisma.product.findUnique({ where: { sku } });
    if (skuConflict) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sku !== undefined && { sku }),
      ...(description !== undefined && { description }),
      ...(unit !== undefined && { unit }),
      ...(minQuantity !== undefined && { minQuantity }),
      ...(price !== undefined && { price }),
      ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
      ...(categoryId !== undefined && { categoryId }),
      ...(supplierId !== undefined && { supplierId }),
    },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ product });
}

// DELETE /api/products/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  // Check for active orders
  const activeOrders = await prisma.orderItem.count({
    where: {
      productId: id,
      order: { status: { in: ["PENDING", "APPROVED", "SHIPPED"] } },
    },
  });
  if (activeOrders > 0) {
    return NextResponse.json(
      { error: "Cannot delete product with active orders" },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

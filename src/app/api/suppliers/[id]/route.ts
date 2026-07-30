import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/suppliers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      products: { select: { id: true, name: true, sku: true, quantity: true, price: true } },
      orders: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { products: true, orders: true } },
    },
  });

  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  return NextResponse.json({ supplier });
}

// PATCH /api/suppliers/[id]  (Admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const body = await req.json();
  const { name, email, phone } = body;

  if (email && email !== existing.email) {
    const conflict = await prisma.supplier.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email.trim().toLowerCase() }),
      ...(phone !== undefined && { phone: phone?.trim() ?? null }),
    },
    include: { _count: { select: { products: true, orders: true } } },
  });

  return NextResponse.json({ supplier });
}

// DELETE /api/suppliers/[id]  (Admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const [productCount, orderCount] = await Promise.all([
    prisma.product.count({ where: { supplierId: id } }),
    prisma.order.count({ where: { supplierId: id } }),
  ]);

  if (productCount > 0 || orderCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete supplier with ${productCount} products and ${orderCount} orders` },
      { status: 409 }
    );
  }

  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

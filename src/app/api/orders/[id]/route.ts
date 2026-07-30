import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, price: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Supplier can only see their own orders
  if (user.role === "supplier") {
    const supplierRecord = await prisma.supplier.findUnique({ where: { userId: user.id } });
    if (!supplierRecord || order.supplierId !== supplierRecord.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ order });
}

// PATCH /api/orders/[id]  — status transitions gated by role
// Admin:    PENDING → APPROVED | REJECTED
// Supplier: APPROVED → SHIPPED
// Employee: SHIPPED → DELIVERED (auto-creates IN stock movement)
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { status, note } = body;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, supplier: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Role-based transition guards
  const allowed = (() => {
    if (user.role === "admin") return ["APPROVED", "REJECTED"].includes(status) && order.status === "PENDING";
    if (user.role === "supplier") {
      // Supplier must own this order
      return status === "SHIPPED" && order.status === "APPROVED";
    }
    if (user.role === "employee") return status === "DELIVERED" && order.status === "SHIPPED";
    return false;
  })();

  if (!allowed) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${status} as ${user.role}` },
      { status: 403 }
    );
  }

  // Supplier check
  if (user.role === "supplier") {
    const supplierRecord = await prisma.supplier.findUnique({ where: { userId: user.id } });
    if (!supplierRecord || order.supplierId !== supplierRecord.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const now = new Date();
  const updateData: Record<string, any> = {
    status,
    ...(note !== undefined && { note }),
    ...(status === "SHIPPED" && { shippedAt: now }),
    ...(status === "DELIVERED" && { deliveredAt: now }),
  };

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
    },
  });

  // When delivered: create IN stock movements for all items
  if (status === "DELIVERED") {
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            note: `Received from order #${id.slice(-8).toUpperCase()}`,
            userId: user.id,
          },
        })
      )
    );

    // Update product quantities
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        })
      )
    );

    // Notify creator
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${id.slice(-8).toUpperCase()} has been delivered and stock has been updated.`,
        userId: order.createdById,
      },
    });
  }

  // Notify supplier user when order is approved
  if (status === "APPROVED" && order.supplier.userId) {
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${id.slice(-8).toUpperCase()} has been approved. Please proceed with shipping.`,
        userId: order.supplier.userId,
      },
    });
  }

  return NextResponse.json({ order: updatedOrder });
}

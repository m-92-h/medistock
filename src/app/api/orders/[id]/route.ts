import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface OrderItemInput {
  unitPrice: number | string | { toString(): string };
  quantity: number | string | { toString(): string };
  [key: string]: unknown;
}

interface OrderInput {
  items?: OrderItemInput[];
  [key: string]: unknown;
}

type Params = { params: Promise<{ id: string }> };

function serializeOrder<T extends OrderInput>(order: T) {
  return {
    ...order,
    items: order.items?.map((item: OrderItemInput) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    })),
  };
}

// GET /api/orders/[id]
export async function GET(req: NextRequest, { params }: Params) {
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

  if (user.role === "supplier") {
    const supplierRecord = await prisma.supplier.findUnique({ where: { userId: user.id } });
    if (!supplierRecord || order.supplierId !== supplierRecord.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ order: serializeOrder(order) });
}

// PATCH /api/orders/[id]
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

  // ── صلاحيات الانتقال ─────────────────────────────────────────────────────
  let allowed = false;

  if (user.role === "admin") {
    allowed = ["APPROVED", "REJECTED"].includes(status) && order.status === "PENDING";
  } else if (user.role === "supplier") {
    const supplierRecord = await prisma.supplier.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    allowed =
      !!supplierRecord &&
      order.supplierId === supplierRecord.id &&
      status === "SHIPPED" &&
      order.status === "APPROVED";
  } else if (user.role === "employee") {
    allowed = status === "DELIVERED" && order.status === "SHIPPED";
  }

  if (!allowed) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${status} as ${user.role}` },
      { status: 403 }
    );
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

  const orderRef = id.slice(-8).toUpperCase();

  // ── APPROVED: إشعار المورد ───────────────────────────────────────────────
  if (status === "APPROVED" && order.supplier.userId) {
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${orderRef} has been approved. Please proceed with shipping.`,
        userId: order.supplier.userId,
      },
    });
  }

  // ── REJECTED: إشعار المورد + منشئ الطلب ─────────────────────────────────
  if (status === "REJECTED") {
    const alertsToCreate: { type: "ORDER"; message: string; userId: string }[] = [];

    // المورد إذا كان لديه حساب
    if (order.supplier.userId) {
      alertsToCreate.push({
        type: "ORDER",
        message: `Order #${orderRef} has been rejected by the administrator.`,
        userId: order.supplier.userId,
      });
    }

    // منشئ الطلب إذا لم يكن هو الأدمن الذي رفض
    if (order.createdById !== user.id) {
      alertsToCreate.push({
        type: "ORDER",
        message: `Your order #${orderRef} has been rejected by the administrator.`,
        userId: order.createdById,
      });
    }

    if (alertsToCreate.length > 0) {
      await prisma.alert.createMany({ data: alertsToCreate });
    }
  }

  // ── SHIPPED: إشعار الأدمن + منشئ الطلب (مع تجنب التكرار) ────────────────
  if (status === "SHIPPED") {
    const supplierName = order.supplier.name;
    const recipientIds = new Set<string>();

    recipientIds.add(order.createdById);

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    admins.forEach((a) => recipientIds.add(a.id));

    await prisma.alert.createMany({
      data: Array.from(recipientIds).map((userId) => ({
        type: "ORDER" as const,
        message: `Order #${orderRef} has been shipped by supplier "${supplierName}". Awaiting delivery confirmation.`,
        userId,
      })),
    });
  }

  // ── DELIVERED: stock movements + تحديث الكميات + إشعارات ────────────────
  if (status === "DELIVERED") {
    // إنشاء حركات المخزون
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            note: `Received from order #${orderRef}`,
            userId: user.id,
          },
        })
      )
    );

    // تحديث الكميات وإرجاع القيم المحدّثة
    const updatedProducts = await Promise.all(
      order.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        })
      )
    );

    // ── إشعار منشئ الطلب بالاستلام ──────────────────────────────────────
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${orderRef} has been delivered and stock has been updated.`,
        userId: order.createdById,
      },
    });

    // ── فحص Low Stock بعد تحديث الكميات ────────────────────────────────
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const product of updatedProducts) {
      if (product.quantity <= product.minQuantity) {
        const recentAlert = await prisma.alert.findFirst({
          where: {
            productId: product.id,
            type: "LOW_STOCK",
            isRead: false,
            createdAt: { gte: oneDayAgo },
          },
          select: { id: true },
        });

        if (!recentAlert) {
          await prisma.alert.create({
            data: {
              type: "LOW_STOCK",
              message: `Low stock after delivery: "${product.name}" has ${product.quantity} units remaining (min: ${product.minQuantity}).`,
              productId: product.id,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ order: serializeOrder(updatedOrder) });
}

// DELETE /api/orders/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only administrators can delete orders" }, { status: 403 });
  }

  await prisma.orderItem.deleteMany({ where: { orderId: id } });
  await prisma.order.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Order deleted successfully" });
}
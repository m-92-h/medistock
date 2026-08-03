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

// PATCH /api/orders/[id] — استبدل دالة PATCH كاملةً بهذا:
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

  // ✅ فحص ملكية المورد مُدمج داخل منطق الصلاحيات
  let allowed = false;

  if (user.role === "admin") {
    allowed = ["APPROVED", "REJECTED"].includes(status) && order.status === "PENDING";
  } else if (user.role === "supplier") {
    const supplierRecord = await prisma.supplier.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    // تحقق من الـ role والملكية والـ transition في خطوة واحدة
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

  // عند التسليم: أنشئ stock movements وحدّث الكميات
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

    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        })
      )
    );

    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${id.slice(-8).toUpperCase()} has been delivered and stock has been updated.`,
        userId: order.createdById,
      },
    });
  }

  // إشعار المورد عند الموافقة
  if (status === "APPROVED" && order.supplier.userId) {
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${id.slice(-8).toUpperCase()} has been approved. Please proceed with shipping.`,
        userId: order.supplier.userId,
      },
    });
  }

  // ✅ إضافة ناقصة: إشعار منشئ الطلب عند الشحن
  if (status === "SHIPPED") {
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${id.slice(-8).toUpperCase()} has been shipped by the supplier.`,
        userId: order.createdById,
      },
    });
  }

  // ✅ إضافة ناقصة: إشعار المورد عند الرفض
  if (status === "REJECTED" && order.supplier.userId) {
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `Order #${id.slice(-8).toUpperCase()} has been rejected by the administrator.`,
        userId: order.supplier.userId,
      },
    });
  }

  return NextResponse.json({ order: updatedOrder });
}
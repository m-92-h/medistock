import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function serializeOrder(order: any) {
  return {
    ...order,
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    })),
  };
}

// GET /api/orders?status=&supplierId=&page=&limit=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const supplierId = searchParams.get("supplierId");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  // Suppliers only see orders assigned to their supplier record
  let supplierFilter: string | undefined;
  if (user.role === "supplier") {
    const supplierRecord = await prisma.supplier.findUnique({
      where: { userId: user.id },
    });
    if (!supplierRecord) {
      return NextResponse.json({ orders: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    supplierFilter = supplierRecord.id;
  }

  const where = {
    ...(status && { status: status as any }),
    ...(supplierId && user.role !== "supplier" && { supplierId }),
    ...(supplierFilter && { supplierId: supplierFilter }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
  orders: orders.map(serializeOrder),
  pagination: { page, limit, total, pages: Math.ceil(total / limit) },
});
}

// POST /api/orders
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { supplierId, note, items } = body;

  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields: supplierId, items[]" },
      { status: 400 }
    );
  }

  // Validate items
  for (const item of items) {
    if (!item.productId || !item.quantity || !item.unitPrice) {
      return NextResponse.json(
        { error: "Each item must have productId, quantity, unitPrice" },
        { status: 400 }
      );
    }
    if (item.quantity <= 0) {
      return NextResponse.json({ error: "Item quantity must be positive" }, { status: 400 });
    }
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const order = await prisma.order.create({
    data: {
      supplierId,
      createdById: user.id,
      note: note ?? null,
      items: {
        create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  // Alert for supplier if linked to a user account
  if (supplier.userId) {
    await prisma.alert.create({
      data: {
        type: "ORDER",
        message: `New purchase order #${order.id.slice(-8).toUpperCase()} requires your attention.`,
        userId: supplier.userId,
      },
    });
  }

  return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/products?search=&categoryId=&supplierId=&lowStock=&page=&limit=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const search     = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");
  const supplierId = searchParams.get("supplierId");
  const lowStock   = searchParams.get("lowStock") === "true";
  const page       = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit      = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip       = (page - 1) * limit;

  const baseWhere = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { sku:  { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(supplierId && { supplierId }),
  };

  // ─── حساب الـ stats الكلية (بدون فلتر lowStock — تعكس المخزن كله دائماً) ──
  const [statsAggregate, totalLowStockCount] = await Promise.all([
    prisma.product.aggregate({
      _count: { id: true },
      _sum:   { quantity: true },
    }),
    // lowStock: جلب كل المنتجات وعدّ التي quantity <= minQuantity (Prisma لا يدعم WHERE column <= column)
    prisma.product.findMany({
      select: { quantity: true, minQuantity: true, price: true },
    }).then((all) => ({
      count: all.filter((p) => p.quantity <= p.minQuantity).length,
      value: all.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0),
    })),
  ]);

  const stats = {
    totalProducts: statsAggregate._count.id,
    totalLowStock: totalLowStockCount.count,
    totalValue:    totalLowStockCount.value,
  };

  // ─── Low Stock Mode ────────────────────────────────────────────────────────
  if (lowStock) {
    const allMatching = await prisma.product.findMany({
      where: baseWhere,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const lowStockProducts = allMatching.filter((p) => p.quantity <= p.minQuantity);
    const total            = lowStockProducts.length;
    const paginated        = lowStockProducts.slice(skip, skip + limit);

    return NextResponse.json({
      products:   paginated.map((p) => ({ ...p, price: Number(p.price) })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      stats,
    });
  }

  // ─── Normal Mode ──────────────────────────────────────────────────────────
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where: baseWhere }),
  ]);

  return NextResponse.json({
    products:   products.map((p) => ({ ...p, price: Number(p.price) })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    stats,
  });
}

// POST /api/products
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const {
    name, sku, description, unit,
    quantity, minQuantity, price,
    expiryDate, categoryId, supplierId,
  } = body;

  if (!name || !sku || price === undefined || price === null || !categoryId || !supplierId) {
    return NextResponse.json(
      { error: "Missing required fields: name, sku, price, categoryId, supplierId" },
      { status: 400 }
    );
  }

  const parsedPrice       = Number(price);
  const parsedQuantity    = Number(quantity    ?? 0);
  const parsedMinQuantity = Number(minQuantity ?? 10);

  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json({ error: "Invalid price value" }, { status: 400 });
  }
  if (isNaN(parsedQuantity) || parsedQuantity < 0) {
    return NextResponse.json({ error: "Invalid quantity value" }, { status: 400 });
  }
  if (isNaN(parsedMinQuantity) || parsedMinQuantity < 0) {
    return NextResponse.json({ error: "Invalid minQuantity value" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      description:  description  ?? null,
      unit:         unit         ?? "قطعة",
      quantity:     parsedQuantity,
      minQuantity:  parsedMinQuantity,
      price:        parsedPrice,
      expiryDate:   expiryDate ? new Date(expiryDate) : null,
      categoryId,
      supplierId,
    },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  if (product.quantity <= product.minQuantity) {
    await prisma.alert.create({
      data: {
        type:      "LOW_STOCK",
        message:   `${product.name} has low stock: ${product.quantity} units (min: ${product.minQuantity})`,
        productId: product.id,
      },
    });
  }

  return NextResponse.json(
    { product: { ...product, price: Number(product.price) } },
    { status: 201 }
  );
}
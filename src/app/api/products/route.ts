import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/products?search=&categoryId=&supplierId=&lowStock=&page=&limit=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");
  const supplierId = searchParams.get("supplierId");
  const lowStock = searchParams.get("lowStock") === "true";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { sku: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(supplierId && { supplierId }),
    ...(lowStock && { quantity: { lte: prisma.product.fields.minQuantity } }),
  };

  // For low stock we need a raw comparison — handle separately
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: lowStock
        ? { ...where, quantity: { lte: 10 } } // fallback — overridden below
        : where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  // If lowStock, re-filter where quantity <= minQuantity (field comparison)
  const finalProducts = lowStock
    ? products.filter((p) => p.quantity <= p.minQuantity)
    : products;

  return NextResponse.json({
    products: finalProducts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/products
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { name, sku, description, unit, quantity, minQuantity, price, expiryDate, categoryId, supplierId } = body;

  if (!name || !sku || !price || !categoryId || !supplierId) {
    return NextResponse.json({ error: "Missing required fields: name, sku, price, categoryId, supplierId" }, { status: 400 });
  }

  // Check SKU uniqueness
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      description: description ?? null,
      unit: unit ?? "قطعة",
      quantity: quantity ?? 0,
      minQuantity: minQuantity ?? 10,
      price,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      categoryId,
      supplierId,
    },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  // Auto-create low stock alert if initial quantity is low
  if (product.quantity <= product.minQuantity) {
    await prisma.alert.create({
      data: {
        type: "LOW_STOCK",
        message: `${product.name} has low stock: ${product.quantity} units (min: ${product.minQuantity})`,
        productId: product.id,
      },
    });
  }

  return NextResponse.json({ product }, { status: 201 });
}

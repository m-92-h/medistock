import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/stock/movements?productId=&type=IN|OUT&page=&limit=
export async function GET(req: NextRequest) {
  try {
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
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/stock/movements
export async function POST(req: NextRequest) {
  try {
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
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    if (type === "OUT" && product.quantity < numericQuantity) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${product.quantity}` }, { status: 400 });
    }

    // Atomic update using increment / decrement
    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { productId, type, quantity: numericQuantity, note: note ?? null, userId: user.id },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          quantity: type === "IN" 
            ? { increment: numericQuantity } 
            : { decrement: numericQuantity },
        },
      }),
    ]);

    // Check for Low Stock alert based on the updated product state
    if (type === "OUT" && updatedProduct.quantity <= updatedProduct.minQuantity) {
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
            message: `Low stock: ${updatedProduct.name} has ${updatedProduct.quantity} units remaining (min: ${updatedProduct.minQuantity})`,
            productId,
          },
        });
      }
    }

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/stock/movements
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const movementId = searchParams.get("movementId");
    if (!movementId) return NextResponse.json({ error: "Missing movementId" }, { status: 400 });

    const movement = await prisma.stockMovement.findUnique({ where: { id: movementId } });
    if (!movement) return NextResponse.json({ error: "Stock movement not found" }, { status: 404 });

    const product = await prisma.product.findUnique({ where: { id: movement.productId } });
    if (!product) return NextResponse.json({ error: "Associated product not found" }, { status: 404 });

    // Validation: Check if deleting an 'IN' movement causes negative stock
    if (movement.type === "IN" && product.quantity < movement.quantity) {
      return NextResponse.json({ 
        error: `Cannot delete movement. Current product quantity (${product.quantity}) is less than movement quantity (${movement.quantity}).` 
      }, { status: 400 });
    }

    // Atomic reversal using increment / decrement
    await prisma.$transaction([
      prisma.stockMovement.delete({ where: { id: movementId } }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: movement.type === "IN" 
            ? { decrement: movement.quantity } 
            : { increment: movement.quantity },
        },
      }),
    ]);

    return NextResponse.json({ message: "Stock movement deleted and product quantity updated." }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
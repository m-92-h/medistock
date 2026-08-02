import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/suppliers  (Admin + Employee — needed for product forms and order creation)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const searchParams = req.nextUrl.searchParams;
    const isMinimal = searchParams.has("minimal");

    if (isMinimal) {
      const suppliers = await prisma.supplier.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(suppliers);
    }

    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { products: true, orders: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("[GET /api/suppliers error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/suppliers  (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

    const body = await req.json();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Supplier with this email already exists" }, { status: 409 });
    }

    const supplier = await prisma.supplier.create({
      data: { name, email, phone },
      select: { id: true },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("[POST /api/suppliers] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

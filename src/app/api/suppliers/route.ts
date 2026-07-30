import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/suppliers  (Admin + Employee — needed for product forms and order creation)
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: { select: { products: true, orders: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ suppliers });
}

// POST /api/suppliers  (Admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { name, email, phone } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const existing = await prisma.supplier.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Supplier with this email already exists" }, { status: 409 });

  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() ?? null,
    },
    include: { _count: { select: { products: true, orders: true } } },
  });

  return NextResponse.json({ supplier }, { status: 201 });
}

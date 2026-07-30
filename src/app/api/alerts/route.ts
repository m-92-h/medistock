import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/alerts?limit=&isRead=&type=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const isRead = searchParams.get("isRead");
  const type = searchParams.get("type");

  // Admin sees all alerts (userId=null OR any userId)
  // Employee sees only their own alerts (userId=their id) + global alerts (userId=null)
  const where =
    user.role === "admin"
      ? {
          ...(isRead !== null && { isRead: isRead === "true" }),
          ...(type && { type: type as any }),
        }
      : {
          OR: [{ userId: user.id }, { userId: null }],
          ...(isRead !== null && { isRead: isRead === "true" }),
          ...(type && { type: type as any }),
        };

  const alerts = await prisma.alert.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ alerts });
}

// POST /api/alerts  (Admin only — manual alert creation)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { type, message, productId, userId } = body;

  if (!type || !message) {
    return NextResponse.json({ error: "Missing required fields: type, message" }, { status: 400 });
  }

  const alert = await prisma.alert.create({
    data: {
      type,
      message,
      productId: productId ?? null,
      userId: userId ?? null,
    },
    include: { product: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ alert }, { status: 201 });
}

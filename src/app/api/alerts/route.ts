// المسار: src/app/api/alerts/route.ts
// استبدل الملف الحالي بهذا الكامل
// التغييرات: أضفنا pagination (page, skip, totalPages, total)
//             وأضفنا دعم إرسال لـ targetRole (دور كامل)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/alerts?page=1&limit=10&isRead=&type=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "10")));
  const skip  = (page - 1) * limit;
  const isRead = searchParams.get("isRead");
  const type   = searchParams.get("type");

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

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);

  return NextResponse.json({
    alerts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/alerts  (Admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { type, message, productId, userId, targetRole } = body;

  if (!type || !message) {
    return NextResponse.json({ error: "Missing required fields: type, message" }, { status: 400 });
  }

  // إرسال لكل أعضاء دور معين
  if (targetRole && !userId) {
    const targets = await prisma.user.findMany({
      where:  { role: targetRole as any },
      select: { id: true },
    });

    if (targets.length === 0) {
      return NextResponse.json({ error: "No users found with this role" }, { status: 404 });
    }

    const alerts = await prisma.$transaction(
      targets.map((t) =>
        prisma.alert.create({
          data: {
            type,
            message,
            productId: productId ?? null,
            userId: t.id,
          },
        })
      )
    );

    return NextResponse.json({ alerts, count: alerts.length }, { status: 201 });
  }

  // تنبيه لمستخدم واحد أو global (userId = null)
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
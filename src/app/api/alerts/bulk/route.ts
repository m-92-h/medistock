import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/alerts/bulk — mark all as read
export async function PATCH(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  // Admin: يقرأ كل التنبيهات
  // Employee: يقرأ تنبيهاته فقط + التنبيهات العامة
  const where =
    user.role === "admin"
      ? { isRead: false }
      : { isRead: false, OR: [{ userId: user.id }, { userId: null }] };

  const { count } = await prisma.alert.updateMany({
    where,
    data: { isRead: true },
  });

  return NextResponse.json({ updated: count });
}

// DELETE /api/alerts/bulk — delete all (Admin only)
export async function DELETE(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { count } = await prisma.alert.deleteMany({});

  return NextResponse.json({ deleted: count });
}
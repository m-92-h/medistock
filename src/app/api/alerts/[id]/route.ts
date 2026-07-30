import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/alerts/[id]  — mark as read
export async function PATCH(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  // Employee can only mark their own or global alerts
  if (user.role === "employee" && alert.userId !== null && alert.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: { isRead: true },
  });

  return NextResponse.json({ alert: updated });
}

// DELETE /api/alerts/[id]  (Admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  await prisma.alert.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

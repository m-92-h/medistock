import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { Role } from "../../../generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/[id]  — change role (Admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { role } = body;

  const validRoles: Role[] = ["admin", "employee", "supplier"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, employee, or supplier" }, { status: 400 });
  }

  // Prevent admin from removing their own admin role
  if (id === user.id && role !== "admin") {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Update Prisma
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
  });

  // Sync to Clerk session claims
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(id, {
    publicMetadata: { role },
  });

  return NextResponse.json({ user: updatedUser });
}

// DELETE /api/users/[id]  (Admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Delete from Clerk (webhook will clean up Prisma via user.deleted event)
  const clerk = await clerkClient();
  await clerk.users.deleteUser(id);

  return NextResponse.json({ success: true });
}

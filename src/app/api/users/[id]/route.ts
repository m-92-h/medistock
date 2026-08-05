import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { Role } from "../../../generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/[id]  — update name, email, role (Admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { role, name, email } = body;

  // ── Validate role ──────────────────────────────────────────────────────────
  const validRoles: Role[] = ["admin", "employee", "supplier"];
  if (role !== undefined && !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, employee, or supplier" }, { status: 400 });
  }

  // ── Prevent admin from removing their own admin role ───────────────────────
  if (id === user.id && role !== undefined && role !== "admin") {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  // ── Validate email format ──────────────────────────────────────────────────
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const clerk = await clerkClient();

  // ── Build Clerk update payload ─────────────────────────────────────────────
  const clerkUserUpdate: Parameters<typeof clerk.users.updateUser>[1] = {};

  if (name !== undefined) {
    const trimmedName = (name ?? "").trim();
    const spaceIndex = trimmedName.indexOf(" ");
    if (spaceIndex === -1) {
      clerkUserUpdate.firstName = trimmedName;
      clerkUserUpdate.lastName = "";
    } else {
      clerkUserUpdate.firstName = trimmedName.slice(0, spaceIndex);
      clerkUserUpdate.lastName = trimmedName.slice(spaceIndex + 1);
    }
  }

  // ── Handle email change in Clerk ───────────────────────────────────────────
  let resolvedEmail = target.email;

  if (email !== undefined && email.trim().toLowerCase() !== target.email.toLowerCase()) {
    const newEmail = email.trim().toLowerCase();

    try {
      // 1. Check if email is already taken in Prisma (excluding current user)
      const existingUser = await prisma.user.findFirst({
        where: { email: newEmail, NOT: { id } },
      });
      if (existingUser) {
        return NextResponse.json({ error: "This email is already in use" }, { status: 409 });
      }

      // 2. Create the new email address on the Clerk user
      const newEmailObj = await clerk.emailAddresses.createEmailAddress({
        userId: id,
        emailAddress: newEmail,
        verified: true,
        primary: false,
      });

      // 3. Set as primary
      clerkUserUpdate.primaryEmailAddressID = newEmailObj.id;

      // 4. Delete the old primary email address
      const clerkUser = await clerk.users.getUser(id);
      const oldEmailId = clerkUser.primaryEmailAddressId;
      if (oldEmailId && oldEmailId !== newEmailObj.id) {
        await clerk.emailAddresses.deleteEmailAddress(oldEmailId);
      }

      resolvedEmail = newEmail;
    } catch (err: unknown) {
  const clerkError = err as { errors?: Array<{ longMessage?: string }>; message?: string };
  const message = clerkError?.errors?.[0]?.longMessage ?? clerkError?.message ?? "Failed to update email in Clerk";
  return NextResponse.json({ error: message }, { status: 500 });
}
  }

  // ── Update Clerk user (name + primaryEmailAddressID if set) ───────────────
  try {
    await clerk.users.updateUser(id, clerkUserUpdate);
  } catch (err: unknown) {
  const clerkError = err as { errors?: Array<{ longMessage?: string }>; message?: string };
  const message = clerkError?.errors?.[0]?.longMessage ?? clerkError?.message ?? "Failed to update user in Clerk";
  return NextResponse.json({ error: message }, { status: 500 });
}

  // ── Sync role to Clerk public metadata if changed ─────────────────────────
  if (role !== undefined) {
    await clerk.users.updateUserMetadata(id, {
      publicMetadata: { role },
    });
  }

  // ── Update Prisma ──────────────────────────────────────────────────────────
  const prismaUpdate: { role?: Role; name?: string | null; email?: string } = {};
  if (role !== undefined) prismaUpdate.role = role;
  if (name !== undefined) prismaUpdate.name = (name ?? "").trim() || null;
  if (resolvedEmail !== target.email) prismaUpdate.email = resolvedEmail;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: prismaUpdate,
    include: { supplier: { select: { id: true, name: true } } },
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

  // ── Check for restricting relations ───────────────────────────────────────
  const [stockMovements, orders] = await Promise.all([prisma.stockMovement.count({ where: { userId: id } }), prisma.order.count({ where: { createdById: id } })]);

  if (stockMovements > 0 || orders > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete this user — they have ${stockMovements} stock movement(s) and ${orders} order(s) linked to their account.`,
      },
      { status: 409 },
    );
  }

  // ── Safe to delete: cleanup Prisma first, then Clerk ──────────────────────
  await prisma.$transaction([prisma.alert.deleteMany({ where: { userId: id } }), prisma.supplier.updateMany({ where: { userId: id }, data: { userId: null } }), prisma.user.delete({ where: { id } })]);

  const clerk = await clerkClient();
  await clerk.users.deleteUser(id);

  return NextResponse.json({ success: true });
}

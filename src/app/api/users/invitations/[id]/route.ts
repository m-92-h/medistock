import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/users/invitations/[id]  — revoke a pending invitation (Admin only)
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const { id } = await params;

  const clerk = await clerkClient();

  try {
    await clerk.invitations.revokeInvitation(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err?.errors?.[0]?.longMessage ?? err?.message ?? "Failed to revoke invitation";
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth";

// GET /api/users/invitations  — pending invitations only (Admin only)
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const clerk = await clerkClient();

  try {
    const pending = await clerk.invitations.getInvitationList({ status: "pending" });

    const invitations = pending.data
      .map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: (inv.publicMetadata?.role as string) ?? "employee",
        status: "pending" as const,
        sentAt: inv.createdAt,
      }))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return NextResponse.json({ invitations });
  } catch (err: any) {
    const message = err?.errors?.[0]?.longMessage ?? err?.message ?? "Failed to fetch invitations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
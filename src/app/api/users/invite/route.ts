import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/auth";

// POST /api/users/invite  (Admin only)
// Body: { email: string, role: "employee" | "supplier" }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const { email, role } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!["employee", "supplier"].includes(role)) {
    return NextResponse.json({ error: "role must be employee or supplier" }, { status: 400 });
  }

  const clerk = await clerkClient();

  try {
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email.trim().toLowerCase(),
      publicMetadata: { role },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/sign-in`,
      ignoreExisting: false,
    });

    return NextResponse.json({ invitation: { id: invitation.id, email: invitation.emailAddress } }, { status: 201 });
  } catch (err: any) {
    const message = err?.errors?.[0]?.longMessage ?? err?.message ?? "Failed to send invitation";
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}

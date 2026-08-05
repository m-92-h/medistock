import { headers } from "next/headers";
import { Webhook } from "svix";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Role } from "../../../generated/prisma/client";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name?: string;
    last_name?: string;
    public_metadata?: { role?: string };
    unsafe_metadata?: { role?: string };
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  // ── user.created / user.updated ──────────────────────────────────────────
  if (type === "user.created" || type === "user.updated") {
    const email = data.email_addresses[0]?.email_address;
    if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

    const rawRole =
      (data.public_metadata?.role as string | undefined) ??
      (data.unsafe_metadata?.role as string | undefined) ??
      "employee";

    const validRoles: Role[] = ["admin", "employee", "supplier"];
    const role: Role = validRoles.includes(rawRole as Role) ? (rawRole as Role) : "employee";

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await prisma.user.upsert({
      where: { id: data.id },
      create: { id: data.id, email, name, role },
      update: { email, name, role },
    });

    // ── ربط المورد بحسابه ────────────────────────────────────────────────
    if (role === "supplier") {
      const supplierRecord = await prisma.supplier.findUnique({
        where: { email },
        select: { id: true, userId: true },
      });
      if (supplierRecord && !supplierRecord.userId) {
        await prisma.supplier.update({
          where: { email },
          data: { userId: data.id },
        });
      }
    }

    // ── إشعار الأدمن عند قبول الدعوة (user.created فقط) ──────────────────
    if (type === "user.created") {
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });

      if (admins.length > 0) {
        const displayName = name || email;
        const message = `${displayName} accepted their invitation and joined the system. [uid:${data.id}]`;

        // الـ uid فريد بطبيعته فلا حاجة لقيد الوقت
        const alreadyNotified = await prisma.alert.findFirst({
          where: {
            type: "GENERAL",
            message: { contains: `[uid:${data.id}]` },
          },
          select: { id: true },
        });

        if (!alreadyNotified) {
          await prisma.alert.createMany({
            data: admins.map((admin) => ({
              type: "GENERAL" as const,
              message,
              userId: admin.id,
            })),
            skipDuplicates: true,
          });
        }
      }
    }
  }

  // ── user.deleted ──────────────────────────────────────────────────────────
  if (type === "user.deleted") {
    await prisma.supplier.updateMany({
      where: { userId: data.id },
      data: { userId: null },
    });
    await prisma.user.deleteMany({ where: { id: data.id } });
  }

  return NextResponse.json({ received: true });
}
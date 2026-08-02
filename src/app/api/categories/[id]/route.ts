import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "../../../generated/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const trimmedName = body.name?.trim();
  if (!trimmedName) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name: trimmedName },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      if (error.code === "P2025") return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
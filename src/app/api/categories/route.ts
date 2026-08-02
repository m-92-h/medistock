import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "../../generated/prisma/client";

// GET /api/categories  (all roles — needed for product forms)
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

// POST /api/categories  (Admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const body = await req.json();
  const trimmedName = body.name?.trim();
  if (!trimmedName) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const category = await prisma.category.create({
      data: { name: trimmedName },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/categories?id=  (Admin only)
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (user.isDemo) return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    // حاول الحذف مباشرة ودع PostgreSQL يتكفل بفحص القيود (Foreign Keys)
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003: Foreign key constraint failed (يوجد منتجات مرتبطة بهذا الصنف)
      if (error.code === "P2003") {
        return NextResponse.json({ error: "Cannot delete category that contains products" }, { status: 409 });
      }
      // P2025: Record to delete does not exist (الصنف غير موجود أصلاً)
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

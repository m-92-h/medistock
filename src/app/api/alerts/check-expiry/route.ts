import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "supplier") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * ONE_DAY_MS);
  const oneDayAgo = new Date(now.getTime() - ONE_DAY_MS);

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      minQuantity: true,
      expiryDate: true,
    },
  });

  const candidateProducts = products.filter(
    (p) =>
      (p.expiryDate && p.expiryDate <= in30Days) ||
      p.quantity <= p.minQuantity
  );

  if (candidateProducts.length === 0) {
    return NextResponse.json({ created: 0, message: "No new alerts needed." });
  }

  const productIds = candidateProducts.map((p) => p.id);

  const recentAlerts = await prisma.alert.findMany({
    where: {
      productId: { in: productIds },
      type: { in: ["EXPIRY", "LOW_STOCK"] },
      createdAt: { gte: oneDayAgo },
    },
    select: { productId: true, type: true },
  });

  const alerted = new Set(recentAlerts.map((a) => `${a.productId}:${a.type}`));

  const alertsToCreate: {
    type: "EXPIRY" | "LOW_STOCK";
    message: string;
    productId: string;
    userId: null;
  }[] = [];

  for (const product of products) {
    // منتهي الصلاحية
    if (product.expiryDate && product.expiryDate < now) {
      if (!alerted.has(`${product.id}:EXPIRY`)) {
        alertsToCreate.push({
          type: "EXPIRY",
          message: `Product "${product.name}" (SKU: ${product.sku}) has expired on ${formatDate(product.expiryDate)}.`,
          productId: product.id,
          userId: null,
        });
      }
    }
    // سينتهي خلال 30 يوماً 
    else if (product.expiryDate && product.expiryDate <= in30Days) {
      if (!alerted.has(`${product.id}:EXPIRY`)) {
        const daysLeft = Math.ceil(
          (product.expiryDate.getTime() - now.getTime()) / ONE_DAY_MS
        );
        alertsToCreate.push({
          type: "EXPIRY",
          message: `Product "${product.name}" (SKU: ${product.sku}) will expire in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} on ${formatDate(product.expiryDate)}.`,
          productId: product.id,
          userId: null,
        });
      }
    }

    // كمية منخفضة
    if (product.quantity <= product.minQuantity) {
      if (!alerted.has(`${product.id}:LOW_STOCK`)) {
        alertsToCreate.push({
          type: "LOW_STOCK",
          message: `Low stock: "${product.name}" (SKU: ${product.sku}) has ${product.quantity} units remaining (min: ${product.minQuantity}).`,
          productId: product.id,
          userId: null,
        });
      }
    }
  }

  if (alertsToCreate.length === 0) {
    return NextResponse.json({ created: 0, message: "No new alerts needed." });
  }

  const { count } = await prisma.alert.createMany({ data: alertsToCreate });

  return NextResponse.json({ created: count });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
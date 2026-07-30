import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports?from=ISO&to=ISO
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toParam ? new Date(toParam) : now;

  const dateRange = { gte: from, lte: to };

  const [
    totalProducts,
    lowStockProducts,
    totalCategories,
    totalSuppliers,
    totalUsers,
    ordersByStatus,
    movementsByType,
    unreadAlerts,
    recentMovements,
    topProducts,
    orderTrend,
    stockTrend,
  ] = await Promise.all([
    // KPIs
    prisma.product.count(),
    prisma.product.findMany({ select: { quantity: true, minQuantity: true } }).then(
      (ps) => ps.filter((p) => p.quantity <= p.minQuantity).length
    ),
    prisma.category.count(),
    prisma.supplier.count(),
    prisma.user.count(),

    // Orders grouped by status
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: from, lte: to } },
    }),

    // Stock movements grouped by type
    prisma.stockMovement.groupBy({
      by: ["type"],
      _sum: { quantity: true },
      _count: { _all: true },
      where: { createdAt: dateRange },
    }),

    // Unread alerts count
    prisma.alert.count({ where: { isRead: false } }),

    // Recent movements for activity feed
    prisma.stockMovement.findMany({
      where: { createdAt: dateRange },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Top products by movement volume
    prisma.stockMovement.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: { createdAt: dateRange },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }).then(async (rows) => {
      const ids = rows.map((r) => r.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, sku: true, quantity: true },
      });
      return rows.map((r) => ({
        product: products.find((p) => p.id === r.productId),
        totalMoved: r._sum.quantity ?? 0,
      }));
    }),

    // Order count per day for trend chart (last 30 days)
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count
      FROM "Order"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `,

    // Stock IN/OUT per day for trend chart
    prisma.$queryRaw<{ date: Date; type: string; total: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") as date, type, SUM(quantity) as total
      FROM "StockMovement"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY DATE_TRUNC('day', "createdAt"), type
      ORDER BY date ASC
    `,
  ]);

  // Serialize bigints for JSON
  const serializeTrend = (rows: { date: Date; count?: bigint; total?: bigint; type?: string }[]) =>
    rows.map((r) => ({
      date: r.date.toISOString().split("T")[0],
      ...(r.count !== undefined && { count: Number(r.count) }),
      ...(r.total !== undefined && { total: Number(r.total) }),
      ...(r.type !== undefined && { type: r.type }),
    }));

  return NextResponse.json({
    kpis: {
      totalProducts,
      lowStockProducts,
      totalCategories,
      totalSuppliers,
      totalUsers,
      unreadAlerts,
    },
    orders: {
      byStatus: ordersByStatus.reduce(
        (acc, row) => ({ ...acc, [row.status]: row._count._all }),
        {} as Record<string, number>
      ),
    },
    stock: {
      movements: movementsByType.reduce(
        (acc, row) => ({
          ...acc,
          [row.type]: { count: row._count._all, total: row._sum.quantity ?? 0 },
        }),
        {} as Record<string, { count: number; total: number }>
      ),
    },
    topProducts,
    recentMovements,
    charts: {
      orderTrend: serializeTrend(orderTrend),
      stockTrend: serializeTrend(stockTrend),
    },
    period: { from: from.toISOString(), to: to.toISOString() },
  });
}

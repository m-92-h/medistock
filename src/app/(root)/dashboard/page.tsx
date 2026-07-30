import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { SupplierDashboard } from "@/components/dashboard/SupplierDashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role === "admin") {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalProducts, allProducts, totalOrders, pendingOrders, unreadAlerts, recentMovements, ordersByStatus, movementTrend, recentOrders] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({ select: { quantity: true, minQuantity: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.alert.count({ where: { isRead: false } }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, type: true, quantity: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: {
          supplier: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: { select: { quantity: true, unitPrice: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const lowStockCount = allProducts.filter((p) => p.quantity <= p.minQuantity).length;

    // Build 30-day movement trend grouped by day
    const trendMap = new Map<string, { IN: number; OUT: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      trendMap.set(key, { IN: 0, OUT: 0 });
    }
    for (const m of movementTrend) {
      const key = m.createdAt.toISOString().split("T")[0];
      const entry = trendMap.get(key);
      if (entry) entry[m.type] += m.quantity;
    }
    const chartData = Array.from(trendMap.entries()).map(([date, v]) => ({
      date,
      IN: v.IN,
      OUT: v.OUT,
    }));

    const statusMap = ordersByStatus.reduce((acc, r) => ({ ...acc, [r.status]: r._count._all }), {} as Record<string, number>);

    return (
      <AdminDashboard
        kpis={{ totalProducts, lowStockCount, totalOrders, pendingOrders, unreadAlerts }}
        chartData={chartData}
        ordersByStatus={statusMap}
        recentMovements={recentMovements}
        recentOrders={recentOrders}
      />
    );
  }

  if (user.role === "employee") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayMovements, myAlerts, pendingOrders] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { userId: user.id, createdAt: { gte: today } },
        include: { product: { select: { name: true, sku: true, unit: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.alert.findMany({
        where: { OR: [{ userId: user.id }, { userId: null }], isRead: false },
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
    ]);

    return <EmployeeDashboard user={{ name: user.name }} todayMovements={todayMovements} alerts={myAlerts} pendingOrders={pendingOrders} />;
  }

  // supplier
  const supplierRecord = await prisma.supplier.findUnique({ where: { userId: user.id } });
  const recentOrders = supplierRecord
    ? await prisma.order.findMany({
        where: { supplierId: supplierRecord.id },
        include: {
          items: { include: { product: { select: { name: true } } } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  const orderCounts = supplierRecord
    ? await prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { supplierId: supplierRecord.id },
      })
    : [];

  const statusMap = orderCounts.reduce((acc, r) => ({ ...acc, [r.status]: r._count._all }), {} as Record<string, number>);

  return <SupplierDashboard user={{ name: user.name }} supplier={supplierRecord} recentOrders={recentOrders} ordersByStatus={statusMap} />;
}

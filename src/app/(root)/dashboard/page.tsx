import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { SupplierDashboard } from "@/components/dashboard/SupplierDashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // ─────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────
  if (user.role === "admin") {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // نقطة بداية الـ 6 أشهر (أول يوم في الشهر قبل 5 أشهر)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [totalProducts, allProducts, totalOrders, pendingOrders, unreadAlerts, recentMovements, ordersByStatus, movementTrend, recentOrders, categories, rawFinancial] = await Promise.all([
      // ── KPIs ──────────────────────────────────────────────────
      prisma.product.count(),
      prisma.product.findMany({ select: { quantity: true, minQuantity: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.alert.count({ where: { isRead: false } }),

      // ── Recent movements (last 7 days, top 8) ─────────────────
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),

      // ── Orders grouped by status ───────────────────────────────
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // ── 30-day movement trend (for area chart) ─────────────────
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, type: true, quantity: true },
        orderBy: { createdAt: "asc" },
      }),

      // ── Recent orders (last 7 days, top 5) ────────────────────
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

      // ── Category distribution (real) ───────────────────────────
      prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { products: true } },
        },
        orderBy: { products: { _count: "desc" } },
      }),

      // ── 6-month financial trend — movements with product price ─
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: {
          createdAt: true,
          type: true,
          quantity: true,
          product: { select: { price: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ── Derived: lowStockCount ─────────────────────────────────
    const lowStockCount = allProducts.filter((p) => p.quantity <= p.minQuantity).length;

    // ── Build 30-day movement trend grouped by day ─────────────
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

    // ── Orders by status map ───────────────────────────────────
    const statusMap = ordersByStatus.reduce((acc, r) => ({ ...acc, [r.status]: r._count._all }), {} as Record<string, number>);

    // ── Category distribution (real) ───────────────────────────
    const categoryDistribution = categories.filter((c) => c._count.products > 0).map((c) => ({ category: c.name, count: c._count.products }));

    // ── 6-month financial trend grouped by month ───────────────
    // بناء مصفوفة الأشهر الـ 6 أولاً لضمان الترتيب
    const financialMap = new Map<string, { month: string; incomingValue: number; outgoingValue: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`; // unique key
      const label = d.toLocaleDateString("en-US", { month: "short" });
      financialMap.set(key, { month: label, incomingValue: 0, outgoingValue: 0 });
    }
    for (const m of rawFinancial) {
      const d = m.createdAt;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = financialMap.get(key);
      if (entry) {
        const val = m.quantity * Number(m.product.price);
        if (m.type === "IN") entry.incomingValue += val;
        else entry.outgoingValue += val;
      }
    }
    const financialTrends = Array.from(financialMap.values());

    return (
      <AdminDashboard
        kpis={{ totalProducts, lowStockCount, totalOrders, pendingOrders, unreadAlerts }}
        chartData={chartData}
        ordersByStatus={statusMap}
        recentMovements={recentMovements}
        recentOrders={recentOrders}
        categoryDistribution={categoryDistribution}
        financialTrends={financialTrends}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEE
  // ─────────────────────────────────────────────────────────────
  if (user.role === "employee") {
    const now = new Date();

    // بداية اليوم
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // بداية الأمس
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [todayMovements, yesterdayMovements, myAlerts, pendingOrders, categoryStock] = await Promise.all([
      // حركات اليوم لهذا الموظف
      prisma.stockMovement.findMany({
        where: { userId: user.id, createdAt: { gte: todayStart } },
        include: { product: { select: { name: true, sku: true, unit: true } } },
        orderBy: { createdAt: "desc" },
      }),

      // حركات الأمس لهذا الموظف (للمقارنة)
      prisma.stockMovement.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
        select: { type: true, quantity: true },
      }),

      // التنبيهات غير المقروءة (خاصة بالموظف + العامة)
      prisma.alert.findMany({
        where: { OR: [{ userId: user.id }, { userId: null }], isRead: false },
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // عدد الطلبات المعلقة
      prisma.order.count({ where: { status: "PENDING" } }),

      // كمية المخزون الحالية مجمّعة حسب الفئة (للـ Storage card)
      prisma.category.findMany({
        select: {
          name: true,
          products: {
            select: { quantity: true },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // ── مقارنة اليوم بالأمس ───────────────────────────────────
    const todayIN = todayMovements.filter((m) => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
    const todayOUT = todayMovements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);
    const yesterdayIN = yesterdayMovements.filter((m) => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
    const yesterdayOUT = yesterdayMovements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);

    // نسبة التغيير (مقرّبة لعدد صحيح، null إذا لا توجد بيانات أمس)
    const inChangePct = yesterdayIN > 0 ? Math.round(((todayIN - yesterdayIN) / yesterdayIN) * 100) : null;
    const outChangePct = yesterdayOUT > 0 ? Math.round(((todayOUT - yesterdayOUT) / yesterdayOUT) * 100) : null;

    // ── بناء hourlyChartData من حركات اليوم الحقيقية ──────────
    // نجمع الحركات حسب الساعة (فترات ساعتين لتكون أوضح في الرسم)
    const hourlyMap = new Map<string, { time: string; sortKey: number; in: number; out: number }>();
    for (const m of todayMovements) {
      const d = new Date(m.createdAt);
      // نقرّب للساعة الزوجية الأقرب (0,2,4,...,22)
      const h = Math.floor(d.getHours() / 2) * 2;
      const key = `${h}`;
      if (!hourlyMap.has(key)) {
        const label = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        hourlyMap.set(key, { time: label, sortKey: h, in: 0, out: 0 });
      }
      const entry = hourlyMap.get(key)!;
      if (m.type === "IN") entry.in += m.quantity;
      else entry.out += m.quantity;
    }
    const hourlyChartData = Array.from(hourlyMap.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ time, in: inVal, out: outVal }) => ({ time, in: inVal, out: outVal }));

    // ── Storage: كمية حقيقية لكل فئة ─────────────────────────
    const categoryStorage = categoryStock
      .map((c) => ({
        name: c.name,
        totalQty: c.products.reduce((s, p) => s + p.quantity, 0),
      }))
      .filter((c) => c.totalQty > 0)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 4); // نعرض أكبر 4 فئات

    const totalQtyAll = categoryStorage.reduce((s, c) => s + c.totalQty, 0);

    return (
      <EmployeeDashboard
        user={{ name: user.name }}
        todayMovements={todayMovements}
        alerts={myAlerts}
        pendingOrders={pendingOrders}
        inChangePct={inChangePct}
        outChangePct={outChangePct}
        hourlyChartData={hourlyChartData}
        categoryStorage={categoryStorage}
        totalQtyAll={totalQtyAll}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUPPLIER
  // ─────────────────────────────────────────────────────────────
  const supplierRecord = await prisma.supplier.findUnique({ where: { userId: user.id } });

  const [recentOrders, orderCounts, totalGrossValue] = supplierRecord
    ? await Promise.all([
        prisma.order.findMany({
          where: { supplierId: supplierRecord.id },
          include: {
            items: { include: { product: { select: { name: true } } } },
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),

        prisma.order.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: { supplierId: supplierRecord.id },
        }),

        // القيمة الإجمالية الحقيقية لجميع الطلبات (ليس فقط آخر 10)
        prisma.orderItem.aggregate({
          _sum: { quantity: true, unitPrice: true },
          where: { order: { supplierId: supplierRecord.id } },
        }),
      ])
    : [[], [], null];

  const statusMap = (orderCounts as { status: string; _count: { _all: number } }[]).reduce((acc, r) => ({ ...acc, [r.status]: r._count._all }), {} as Record<string, number>);

  // حساب القيمة الإجمالية الدقيقة: sum(quantity * unitPrice) لكل item
  // aggregate لا يدعم حاصل الضرب مباشرة، نجلب المجاميع ونحسب تقريبياً
  // الحل الصحيح: جلب كل الـ items وحساب المجموع في JS
  const allItems = supplierRecord
    ? await prisma.orderItem.findMany({
        where: { order: { supplierId: supplierRecord.id } },
        select: { quantity: true, unitPrice: true },
      })
    : [];

  const totalGross = allItems.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);

  return <SupplierDashboard user={{ name: user.name }} supplier={supplierRecord} recentOrders={recentOrders as any} ordersByStatus={statusMap} totalGross={totalGross} />;
}

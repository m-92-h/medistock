"use client";

import { useId } from "react";
import Link from "next/link";
import { Package, ShoppingCart, Bell, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Clock, CheckCircle2, XCircle, Truck, Activity, ArrowUpRight, ArrowDownRight, Layers, DollarSign } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface KPIs {
  totalProducts: number;
  lowStockCount: number;
  totalOrders: number;
  pendingOrders: number;
  unreadAlerts: number;
}

interface KpiCardProps {
  title: string;
  value: number | string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral" | "danger";
  subText?: string;
  icon: React.ElementType;
  href?: string;
  sparklineData?: number[];
  sparklineColor?: string;
}

interface ChartPoint {
  date: string;
  IN: number;
  OUT: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface MonthlyFinancial {
  month: string;
  incomingValue: number;
  outgoingValue: number;
}

interface RecentMovement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  createdAt: Date;
  product: { name: string; sku: string } | null;
  user: { name: string | null } | null;
}

interface RecentOrder {
  id: string;
  status: string;
  createdAt: Date;
  supplier: { name: string } | null;
  createdBy: { name: string | null } | null;
  items: { quantity: number; unitPrice: any }[];
}

interface Props {
  kpis: KPIs;
  chartData: ChartPoint[];
  ordersByStatus: Record<string, number>;
  recentMovements: RecentMovement[];
  recentOrders: RecentOrder[];
  categoryDistribution: CategoryData[];
  financialTrends: MonthlyFinancial[];
}

// ─── Helpers & Config ────────────────────────────────────────────────────────
const ORDER_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    colorClass: string;
    borderClass: string;
    icon: React.ElementType;
  }
> = {
  PENDING: {
    label: "Pending",
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500/20",
    icon: Activity,
  },
  REJECTED: {
    label: "Rejected",
    colorClass: "bg-destructive/10 text-destructive",
    borderClass: "border-destructive/20",
    icon: XCircle,
  },
  SHIPPED: {
    label: "Shipped",
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-500/20",
    icon: Truck,
  },
  DELIVERED: {
    label: "Delivered",
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/20",
    icon: CheckCircle2,
  },
};

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function orderTotal(items: RecentOrder["items"]) {
  return items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ title, value, change, changeType = "neutral", icon: Icon, href, sparklineData, sparklineColor = "var(--color-primary)" }: KpiCardProps) {
  const rawId = useId();
  const gradientId = `kpi-grad-${rawId.replace(/:/g, "")}`;
  const chartData = sparklineData?.map((val, i) => ({ id: i, val })) ?? [];

  // إعدادات البصريات حسب الحالة (Themes & Color Accents)
  const variants = {
    increase: {
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white!",
      glow: "from-emerald-500/10 to-transparent",
      accentBar: "bg-emerald-500",
    },
    decrease: {
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white!",
      glow: "from-amber-500/10 to-transparent",
      accentBar: "bg-amber-500",
    },
    danger: {
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white!",
      glow: "from-rose-500/10 to-transparent",
      accentBar: "bg-rose-500",
    },
    neutral: {
      badge: "bg-secondary text-muted-foreground border-border/60",
      iconBg: "bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground",
      glow: "from-primary/5 to-transparent",
      accentBar: "bg-primary",
    },
  };

  const currentVariant = variants[changeType] || variants.neutral;

  const TrendIcon = changeType === "increase" ? TrendingUp : changeType === "danger" || changeType === "decrease" ? TrendingDown : null;

  const content = (
    <Card
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden transition-all duration-300",
        "border border-border/60 bg-gradient-to-b from-card to-card/95 shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-5 min-h-[156px]",
      )}
    >
      {/* 1. Ambient Background Glow on Hover */}
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 pointer-events-none", currentVariant.glow)} />

      {/* 2. Top Header: Title & Styled Icon Box */}
      <div className="flex items-center justify-between gap-3 z-10 w-full">
        {/* Left Section: Icon & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm", currentVariant.iconBg)}>
            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </div>

          <span className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-300 group-hover:text-foreground">{title}</span>
        </div>

        {/* Right Section: Action Link / Arrow */}
        {href && (
          <div className="flex shrink-0 items-center justify-center rounded-lg p-1 text-muted-foreground transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        )}
      </div>

      {/* 3. Middle Section: Big Value & Metric Badge */}
      <div className="flex items-baseline justify-between gap-3 z-10 my-2">
        <span className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{value}</span>

        {change && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all duration-200 shrink-0 shadow-2xs", currentVariant.badge)}>
            {TrendIcon && <TrendIcon className="h-3 w-3 shrink-0" />}
            <span>{change}</span>
          </span>
        )}
      </div>

      {/* 5. Dynamic Background Sparkline */}
      {chartData.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-14 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none z-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke={sparklineColor} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 6. Hover Bottom Accent Line */}
      <div className={cn("absolute bottom-0 inset-x-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left", currentVariant.accentBar)} />
    </Card>
  );

  return href ? (
    <Link href={href} className="block cursor-pointer outline-none rounded-xl">
      {content}
    </Link>
  ) : (
    content
  );
}

// ─── Custom Tooltips ─────────────────────────────────────────────────────────
function StockTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-foreground border-b border-border/50 pb-1">{formatShortDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground font-medium">{p.dataKey === "IN" ? "Stock In" : "Stock Out"}:</span>
          </div>
          <span className="font-bold tabular-nums text-foreground">{p.value} units</span>
        </div>
      ))}
    </div>
  );
}

function FinancialTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 min-w-[150px]">
      <p className="font-semibold text-foreground border-b border-border/50 pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted-foreground font-medium">{p.name}:</span>
          </div>
          <span className="font-bold tabular-nums text-foreground">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminDashboard({ kpis, chartData, ordersByStatus, recentMovements, recentOrders, categoryDistribution, financialTrends }: Props) {
  // ── Derived chart data ────────────────────────────────────────
  const pieData = Object.entries(ordersByStatus)
    .filter(([, v]) => v > 0)
    .map(([status, value], index) => ({
      name: ORDER_STATUS_CONFIG[status]?.label ?? status,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const totalOrdersPie = pieData.reduce((acc, item) => acc + item.value, 0);

  // آخر 14 يوم للـ area chart
  const chartSlice = chartData.slice(-14);

  // Sparkline للـ KPI cards من بيانات الحركات الحقيقية
  const stockSparkline = chartSlice.map((d) => d.IN);
  const outSparkline = chartSlice.map((d) => d.OUT);

  // Stock health score
  const stockHealthPercentage = Math.max(0, Math.round(((kpis.totalProducts - kpis.lowStockCount) / (kpis.totalProducts || 1)) * 100));

  // Category: أكبر قيمة للـ progress bars
  const maxCategoryCount = Math.max(...categoryDistribution.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time medical inventory analytics, procurement values, and activity operations.</p>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Products" value={kpis.totalProducts.toLocaleString()} subText="Active catalog items" icon={Package} href="/products" sparklineData={stockSparkline} sparklineColor="var(--color-chart-1)" />

        <KpiCard
          title="Stock Alerts"
          value={kpis.lowStockCount}
          change={kpis.lowStockCount > 0 ? "Requires Action" : "Optimal"}
          changeType={kpis.lowStockCount > 0 ? "danger" : "increase"}
          icon={AlertTriangle}
          href="/products?lowStock=true"
          sparklineData={outSparkline}
          sparklineColor="var(--color-chart-5)"
        />

        <KpiCard
          title="Purchase Orders"
          value={kpis.totalOrders}
          change={`${kpis.pendingOrders} Pending`}
          changeType={kpis.pendingOrders > 0 ? "decrease" : "neutral"}
          icon={ShoppingCart}
          href="/orders"
          sparklineData={stockSparkline.map((v, i) => outSparkline[i] ?? v)}
          sparklineColor="var(--color-chart-3)"
        />

        <KpiCard
          title="Unread Alerts"
          value={kpis.unreadAlerts}
          change={kpis.unreadAlerts > 0 ? "Needs Review" : "All Clear"}
          changeType={kpis.unreadAlerts > 0 ? "danger" : "increase"}
          icon={Bell}
          href="/alerts"
          sparklineData={stockSparkline}
          sparklineColor="var(--color-chart-2)"
        />
      </div>

      {/* ── Row 1: Area Chart + Donut ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stock Movement Area Chart */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Stock Movements</CardTitle>
              <CardDescription className="text-xs">Inflow (Received) vs. Outflow (Dispatched) — Last 14 Days</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-chart-2)]" />
                <span className="text-muted-foreground">Received (IN)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-chart-5)]" />
                <span className="text-muted-foreground">Dispatched (OUT)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            {chartSlice.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No movement data for the last 14 days</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartSlice} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIN" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorOUT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-5)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-chart-5)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<StockTooltip />} />
                  <Area type="monotone" dataKey="IN" stroke="var(--color-chart-2)" strokeWidth={2.5} fill="url(#colorIN)" activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="OUT" stroke="var(--color-chart-5)" strokeWidth={2.5} fill="url(#colorOUT)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders Distribution Donut */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold">Orders Breakdown</CardTitle>
            <CardDescription className="text-xs">Distribution by order status</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {pieData.length === 0 ? (
              <div className="flex h-[220px] flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <ShoppingCart className="h-8 w-8 text-muted/50" />
                No orders recorded yet
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={78} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Donut Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{totalOrdersPie}</span>
                    <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Total Orders</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-semibold text-foreground tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Financial BarChart + Category Distribution ────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Financial Value Flow */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Financial Inventory Value Flow
              </CardTitle>
              <CardDescription className="text-xs">Monthly valuation of stock received vs. dispatched — Last 6 months</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            {financialTrends.every((m) => m.incomingValue === 0 && m.outgoingValue === 0) ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No financial data available for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={financialTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FinancialTooltip />} cursor={{ fill: "var(--color-accent)", rx: 4, opacity: 0.6 }} />
                  <Bar name="Inflow Value" dataKey="incomingValue" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar name="Outflow Value" dataKey="outgoingValue" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Inventory Category Share */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Inventory Category Share
            </CardTitle>
            <CardDescription className="text-xs">Product distribution across medical categories</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-3.5 pb-4">
            {categoryDistribution.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">No categories with products yet</div>
            ) : (
              categoryDistribution.map((cat) => {
                const pct = Math.round((cat.count / maxCategoryCount) * 100);
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-foreground">{cat.category}</span>
                      <span className="text-muted-foreground font-mono">
                        {cat.count} items ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Stock Ledger + Procurement Orders ─────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Stock Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Stock Ledger</CardTitle>
              <CardDescription className="text-xs">Recent stock movements</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs cursor-pointer hover:bg-accent" render={<Link href="/stock/movements" />}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {recentMovements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent movements recorded</p>
            ) : (
              recentMovements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-accent/50 transition-all border border-transparent hover:border-border/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.type === "IN" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive")}>
                      {m.type === "IN" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{m.product?.name ?? "Unknown Item"}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>{m.user?.name ?? "System Auto"}</span>
                        <span>•</span>
                        <span>{formatDate(m.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 font-mono text-xs font-semibold px-2.5 py-0.5",
                      m.type === "IN" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/20" : "text-destructive bg-destructive/5 border-destructive/20",
                    )}
                  >
                    {m.type === "IN" ? "+" : "−"}
                    {m.quantity}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Procurement Orders</CardTitle>
              <CardDescription className="text-xs">Latest supplier activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs cursor-pointer hover:bg-accent" render={<Link href="/orders" />}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent orders submitted</p>
            ) : (
              recentOrders.map((o) => {
                const cfg = ORDER_STATUS_CONFIG[o.status] ?? ORDER_STATUS_CONFIG.PENDING;
                const StatusIcon = cfg.icon;
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-accent/50 transition-all border border-transparent hover:border-border/60 cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{o.supplier?.name ?? "Direct Purchase"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          By {o.createdBy?.name ?? "Admin"} • {formatDate(o.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0 border", cfg.colorClass, cfg.borderClass)}>
                        {cfg.label}
                      </Badge>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        $
                        {orderTotal(o.items).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

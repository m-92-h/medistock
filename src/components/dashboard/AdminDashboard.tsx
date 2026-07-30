"use client";

import Link from "next/link";
import { Package, ShoppingCart, Bell, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface KPIs {
  totalProducts: number;
  lowStockCount: number;
  totalOrders: number;
  pendingOrders: number;
  unreadAlerts: number;
}

interface ChartPoint {
  date: string;
  IN: number;
  OUT: number;
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; cssColor: string }> = {
  PENDING: { label: "Pending", color: "var(--warning)", cssColor: "#f59e0b" },
  APPROVED: { label: "Approved", color: "var(--info)", cssColor: "#3b82f6" },
  REJECTED: { label: "Rejected", color: "var(--destructive)", cssColor: "#ef4444" },
  SHIPPED: { label: "Shipped", color: "var(--chart-4)", cssColor: "#a855f7" },
  DELIVERED: { label: "Delivered", color: "var(--success)", cssColor: "#22c55e" },
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderTotal(items: RecentOrder["items"]) {
  return items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, accent, href }: { title: string; value: number | string; sub?: string; icon: React.ElementType; accent: string; href?: string }) {
  const content = (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn("absolute inset-y-0 left-0 w-1 rounded-l-xl", accent)} />
      <CardContent className="flex items-center gap-4 p-5 pl-6">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accent.replace("bg-", "bg-") + "/10")}>
          <Icon className={cn("h-5 w-5", accent.replace("bg-", "text-"))} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function StockTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{formatShortDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.dataKey}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminDashboard({ kpis, chartData, ordersByStatus, recentMovements, recentOrders }: Props) {
  const pieData = Object.entries(ordersByStatus)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: ORDER_STATUS_CONFIG[status]?.label ?? status,
      value,
      color: ORDER_STATUS_CONFIG[status]?.cssColor ?? "#888",
    }));

  // Show only last 14 data points on chart for readability
  const chartSlice = chartData.slice(-14);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Stock status and activity for the last 30 days</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Total Products" value={kpis.totalProducts} sub={`${kpis.lowStockCount} low stock`} icon={Package} accent="bg-primary" href="/products" />
        <KpiCard
          title="Low Stock"
          value={kpis.lowStockCount}
          sub="Below minimum"
          icon={AlertTriangle}
          accent={kpis.lowStockCount > 0 ? "bg-destructive" : "bg-success"}
          href="/products?lowStock=true"
        />
        <KpiCard title="Total Orders" value={kpis.totalOrders} sub={`${kpis.pendingOrders} pending`} icon={ShoppingCart} accent="bg-chart-4" href="/orders" />
        <KpiCard title="Unread Alerts" value={kpis.unreadAlerts} sub="Require attention" icon={Bell} accent={kpis.unreadAlerts > 0 ? "bg-warning" : "bg-success"} href="/alerts" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stock movement area chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stock Movement — Last 14 Days</CardTitle>
            <CardDescription className="text-xs">Units received (IN) vs. dispatched (OUT)</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartSlice} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIN" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOUT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-5)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<StockTooltip />} />
                <Area type="monotone" dataKey="IN" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#colorIN)" dot={false} />
                <Area type="monotone" dataKey="OUT" stroke="var(--color-chart-5)" strokeWidth={2} fill="url(#colorOUT)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by status donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orders by Status</CardTitle>
            <CardDescription className="text-xs">All-time distribution</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {pieData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={7} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row — recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent movements */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Movements</CardTitle>
              <CardDescription className="text-xs">Last 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" render={<Link href="/stock/movements" />}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pb-4">
            {recentMovements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No movements recorded</p>
            ) : (
              recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", m.type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {m.type === "IN" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{m.product?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.user?.name ?? "System"} · {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <Badge variant={m.type === "IN" ? "outline" : "secondary"} className={cn("shrink-0 text-xs font-medium", m.type === "IN" ? "text-success border-success/30" : "text-destructive")}>
                    {m.type === "IN" ? "+" : "−"}
                    {m.quantity}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
              <CardDescription className="text-xs">Last 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" render={<Link href="/orders" />}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pb-4">
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders this week</p>
            ) : (
              recentOrders.map((o) => {
                const cfg = ORDER_STATUS_CONFIG[o.status];
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{o.supplier?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        by {o.createdBy?.name ?? "—"} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant="outline" className="text-xs" style={{ color: cfg?.cssColor, borderColor: cfg?.cssColor + "40" }}>
                        {cfg?.label ?? o.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">${orderTotal(o.items).toFixed(0)}</span>
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

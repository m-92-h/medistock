"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Bell, ShoppingCart, ArrowRight, CheckCircle2, Plus, Package, AlertTriangle, BarChart2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Movement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  createdAt: Date;
  note: string | null;
  product: { name: string; sku: string; unit: string } | null;
}

interface Alert {
  id: string;
  type: "LOW_STOCK" | "EXPIRY" | "ORDER" | "GENERAL";
  message: string;
  isRead: boolean;
  createdAt: Date;
  product: { name: string } | null;
}

interface ChartPoint {
  time: string;
  in: number;
  out: number;
}

interface CategoryStorage {
  name: string;
  totalQty: number;
}

interface Props {
  user: { name: string | null };
  todayMovements: Movement[];
  alerts: Alert[];
  pendingOrders: number;
  inChangePct: number | null;
  outChangePct: number | null;
  hourlyChartData: ChartPoint[];
  categoryStorage: CategoryStorage[];
  totalQtyAll: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ALERT_CONFIG: Record<Alert["type"], { label: string; badgeClass: string; dotColor: string }> = {
  LOW_STOCK: {
    label: "Low Stock",
    badgeClass: "text-destructive border-destructive/30 bg-destructive/5",
    dotColor: "bg-destructive",
  },
  EXPIRY: {
    label: "Expiry",
    badgeClass: "text-warning border-warning/30 bg-warning/5",
    dotColor: "bg-warning",
  },
  ORDER: {
    label: "Order",
    badgeClass: "text-info border-info/30 bg-info/5",
    dotColor: "bg-info",
  },
  GENERAL: {
    label: "General",
    badgeClass: "text-muted-foreground border-border bg-muted/20",
    dotColor: "bg-muted-foreground",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Change Badge (نسبة التغيير عن الأمس) ────────────────────────────────────
function ChangeBadge({ pct, positiveIsGood = true }: { pct: number | null; positiveIsGood?: boolean }) {
  if (pct === null) {
    return (
      <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium">
        <Minus className="h-3.5 w-3.5 mr-0.5" />
        <span>No data from yesterday</span>
      </div>
    );
  }

  const isPositive = pct >= 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  const colorClass = isGood ? "text-emerald-600" : "text-rose-600";
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("mt-2 flex items-center text-xs font-medium", colorClass)}>
      <Icon className="h-3.5 w-3.5 mr-0.5" />
      <span>
        {isPositive ? "+" : ""}
        {pct}% from yesterday
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EmployeeDashboard({ user, todayMovements, alerts, pendingOrders, inChangePct, outChangePct, hourlyChartData, categoryStorage, totalQtyAll }: Props) {
  const todayIN = todayMovements.filter((m) => m.type === "IN").reduce((s, m) => s + m.quantity, 0);

  const todayOUT = todayMovements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);

  const firstName = user.name ? user.name.split(" ")[0] : null;

  const hasChartData = hourlyChartData.length > 0;

  return (
    <div className="space-y-6" dir="ltr">
      {/* ─── Header & Actions ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Good day{firstName ? `, ${firstName}` : ""} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here is your daily stock movement overview and pending tasks</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer" render={<Link href="/stock/movements" />}>
            <Package className="h-4 w-4" />
            Quick Audit
          </Button>

          <Button size="sm" className="gap-2 cursor-pointer" render={<Link href="/stock/adjust" />}>
            <Plus className="h-4 w-4" />
            Record Movement
          </Button>
        </div>
      </div>

      {/* ─── Top Key Metrics Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Units Received */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Units Received (Inflow)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight">{todayIN}</span>
              <span className="text-xs text-muted-foreground">units</span>
            </div>
            <ChangeBadge pct={inChangePct} positiveIsGood={true} />
          </CardContent>
        </Card>

        {/* Units Dispatched */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Units Dispatched (Outflow)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight">{todayOUT}</span>
              <span className="text-xs text-muted-foreground">units</span>
            </div>
            <ChangeBadge pct={outChangePct} positiveIsGood={true} />
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pending Orders</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight">{pendingOrders}</span>
              <span className="text-xs text-muted-foreground">orders</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{pendingOrders > 0 ? "Requires action" : "All clear"}</p>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Critical Alerts</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight">{alerts.length}</span>
              <span className="text-xs text-muted-foreground">notifications</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Visual Charts Section ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart: Stock Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Today&apos;s Stock Activity Flow
              </CardTitle>
              <CardDescription className="text-xs">Real-time comparison between incoming and outgoing stock</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Received (IN)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Dispatched (OUT)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full pt-4">
              {hasChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                    <XAxis dataKey="time" className="text-[11px] text-muted-foreground" tickLine={false} />
                    <YAxis className="text-[11px] text-muted-foreground" tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="in" name="Inflow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                    <Area type="monotone" dataKey="out" name="Outflow" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No movements recorded today</p>
                  <p className="text-xs text-muted-foreground/60">Chart will update as you record stock movements</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Capacity */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Storage Capacity</CardTitle>
            <CardDescription className="text-xs">Current stock volume by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {totalQtyAll === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Package className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No stock on hand</p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span>Total Units in Stock</span>
                    <span className="text-primary tabular-nums">{totalQtyAll.toLocaleString()}</span>
                  </div>
                  <Progress value={100} className="h-2.5" />
                </div>

                <div className="space-y-3 rounded-lg bg-muted/40 p-3 text-xs">
                  {categoryStorage.map((c) => {
                    const pct = totalQtyAll > 0 ? Math.round((c.totalQty / totalQtyAll) * 100) : 0;
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-muted-foreground truncate max-w-[120px]">{c.name}</span>
                          <span className="font-semibold tabular-nums">{c.totalQty.toLocaleString()} units</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" render={<Link href="/products" />}>
              <Package className="h-3.5 w-3.5" />
              View All Products
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Section: Recent Movements & Alerts ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">My Movements Today</CardTitle>
              <CardDescription className="text-xs">
                {todayMovements.length} transaction
                {todayMovements.length !== 1 ? "s" : ""} recorded
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer" render={<Link href="/stock/movements" />}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pb-3">
            {todayMovements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No movements recorded today</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {todayMovements.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 hover:bg-muted/30 rounded-md px-1 transition-colors">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.type === "IN" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                      {m.type === "IN" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{m.product?.name ?? "—"}</p>
                      {m.note && <p className="truncate text-[11px] text-muted-foreground mt-0.5">{m.note}</p>}
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-xs font-semibold tabular-nums", m.type === "IN" ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" : "text-rose-600 border-rose-500/30 bg-rose-500/5")}>
                      {m.type === "IN" ? "+" : "−"}
                      {m.quantity} {m.product?.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                System Alerts
                {alerts.length > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">{alerts.length}</span>}
              </CardTitle>
              <CardDescription className="text-xs">Unread notifications needing attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground" render={<Link href="/alerts" />}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pb-3">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                <p className="text-sm font-medium">No unread alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.map((a) => {
                  const cfg = ALERT_CONFIG[a.type];
                  return (
                    <div key={a.id} className="flex items-start gap-3 py-2.5 hover:bg-muted/30 rounded-md px-1 transition-colors">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dotColor)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground leading-snug font-medium">{a.message}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{timeAgo(a.createdAt)}</p>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0 text-[10px] font-medium", cfg.badgeClass)}>
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

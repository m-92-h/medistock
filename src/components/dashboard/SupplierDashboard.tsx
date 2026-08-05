"use client";

import Link from "next/link";
import { ShoppingCart, ArrowRight, Package, Truck, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderItem {
  quantity: number;
  unitPrice: number;
  product: { name: string } | null;
}

interface Order {
  id: string;
  status: string;
  createdAt: Date;
  note: string | null;
  createdBy: { name: string | null } | null;
  items: OrderItem[];
}

interface Props {
  user: { name: string | null };
  supplier: { id: string; name: string } | null;
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
  totalGross: number;
}

// ─── Config & Helpers ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    iconClass: string;
    iconBg: string;
    badgeClass: string;
    barColor: string;
  }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    badgeClass: "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5",
    barColor: "var(--color-chart-1)",
  },
  APPROVED: {
    label: "Approved",
    icon: Package,
    iconClass: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10",
    badgeClass: "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5",
    barColor: "var(--color-chart-2)",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    iconClass: "text-destructive",
    iconBg: "bg-destructive/10",
    badgeClass: "text-destructive border-destructive/20 bg-destructive/5",
    barColor: "var(--color-chart-5)",
  },
  SHIPPED: {
    label: "Shipped",
    icon: Truck,
    iconClass: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10",
    badgeClass: "text-purple-600 dark:text-purple-400 border-purple-500/20 bg-purple-500/5",
    barColor: "var(--color-chart-4)",
  },
  DELIVERED: {
    label: "Delivered",
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
    badgeClass: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    barColor: "var(--color-chart-3)",
  },
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function orderTotal(items: OrderItem[]) {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiStatCard({
  title,
  value,
  subText,
  icon: Icon,
  badgeText,
  badgeVariant = "neutral",
}: {
  title: string;
  value: number | string;
  subText?: string;
  icon: React.ElementType;
  badgeText?: string;
  badgeVariant?: "warning" | "success" | "neutral" | "purple";
}) {
  const badgeStyles = {
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    neutral: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <Card className="border border-border/60 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
      <CardContent className="p-5 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</span>
          {badgeText && (
            <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0.5", badgeStyles[badgeVariant])}>
              {badgeText}
            </Badge>
          )}
        </div>

        {subText && <p className="text-[11px] font-medium text-muted-foreground">{subText}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Custom Bar Tooltip ───────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs space-y-1 min-w-[120px]">
      <p className="font-semibold text-foreground border-b border-border/50 pb-1">{label}</p>
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-muted-foreground">Volume:</span>
        <span className="font-bold tabular-nums text-foreground">
          {payload[0].value} {payload[0].value === 1 ? "order" : "orders"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SupplierDashboard({ user, supplier, recentOrders, ordersByStatus, totalGross }: Props) {
  const totalOrders = Object.values(ordersByStatus).reduce((s, v) => s + v, 0);
  const pendingCount = ordersByStatus["PENDING"] ?? 0;
  const shippedCount = ordersByStatus["SHIPPED"] ?? 0;

  const barData = Object.entries(STATUS_CONFIG)
    .map(([key, cfg]) => ({
      name: cfg.label,
      value: ordersByStatus[key] ?? 0,
      color: cfg.barColor,
    }))
    .filter((d) => d.value > 0);

  const firstName = user.name ? user.name.split(" ")[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>{supplier ? supplier.name : "Supplier Portal"}</span>
            <span>•</span>
            <span>Procurement & Dispatch Overview</span>
          </p>
        </div>
      </div>

      {/* Supplier Not Linked Alert */}
      {!supplier && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Account Disconnected:</span> Your user profile isn&apos;t associated with an active supplier profile. Please contact system administrators.
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard title="Total Orders" value={totalOrders} subText="All-time purchase orders" icon={ShoppingCart} badgeText="Lifetime" badgeVariant="neutral" />

        <KpiStatCard title="Awaiting Action" value={pendingCount} subText="Requires review or dispatch" icon={Clock} badgeText={pendingCount > 0 ? "Action Required" : "All Clear"} badgeVariant={pendingCount > 0 ? "warning" : "success"} />

        <KpiStatCard title="In Transit" value={shippedCount} subText="Currently shipped orders" icon={Truck} badgeText="On the way" badgeVariant="purple" />

        {/* totalGross */}
        <KpiStatCard
          title="Total Gross Value"
          value={`$${totalGross.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          subText="Lifetime order value"
          icon={DollarSign}
          badgeText="All-time"
          badgeVariant="success"
        />
      </div>

      {/* Charts & Activity Logs */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Distribution Bar Chart */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders Status Volume</CardTitle>
            <CardDescription className="text-xs">Distribution of orders across all operational stages</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {barData.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p>No orders assigned to your portal yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--color-accent)", opacity: 0.4 }} />
                  <Bar dataKey="value" name="Orders" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders Ledger */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              <CardDescription className="text-xs">Latest assigned procurement requests</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs cursor-pointer hover:bg-accent" render={<Link href="/orders" />}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pb-4">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs">No active orders found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o) => {
                  const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.PENDING;
                  const Icon = cfg.icon;
                  const total = orderTotal(o.items);

                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-accent/50 transition-all border border-transparent hover:border-border/60 cursor-pointer group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.iconBg)}>
                          <Icon className={cn("h-4 w-4", cfg.iconClass)} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Order #{o.id.slice(-8).toUpperCase()}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatDate(o.createdAt)} • {o.items.length} {o.items.length === 1 ? "item" : "items"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0 border", cfg.badgeClass)}>
                          {cfg.label}
                        </Badge>
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          $
                          {total.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </Link>
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

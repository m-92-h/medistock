"use client";

import Link from "next/link";
import { ShoppingCart, ArrowRight, Package, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  createdAt: Date;
  note: string | null;
  createdBy: { name: string | null } | null;
  items: { quantity: number; unitPrice: any; product: { name: string } | null }[];
}

interface Props {
  user: { name: string | null };
  supplier: { id: string; name: string } | null;
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bar: string }> = {
  PENDING: { label: "Pending", icon: Clock, color: "text-warning", bar: "#f59e0b" },
  APPROVED: { label: "Approved", icon: Package, color: "text-info", bar: "#3b82f6" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "text-destructive", bar: "#ef4444" },
  SHIPPED: { label: "Shipped", icon: Truck, color: "text-chart-4", bar: "#a855f7" },
  DELIVERED: { label: "Delivered", icon: CheckCircle2, color: "text-success", bar: "#22c55e" },
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function orderTotal(items: Order["items"]) {
  return items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
}

export function SupplierDashboard({ user, supplier, recentOrders, ordersByStatus }: Props) {
  const totalOrders = Object.values(ordersByStatus).reduce((s, v) => s + v, 0);
  const pendingCount = ordersByStatus["PENDING"] ?? 0;
  const shippedCount = ordersByStatus["SHIPPED"] ?? 0;

  const barData = Object.entries(STATUS_CONFIG)
    .map(([key, cfg]) => ({
      name: cfg.label,
      value: ordersByStatus[key] ?? 0,
      color: cfg.bar,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{supplier ? supplier.name : "Supplier portal"} — order summary</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 p-5">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold tabular-nums">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 p-5">
            <Clock className="h-5 w-5 text-warning" />
            <p className="text-2xl font-bold tabular-nums">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 p-5">
            <Truck className="h-5 w-5 text-chart-4" />
            <p className="text-2xl font-bold tabular-nums">{shippedCount}</p>
            <p className="text-xs text-muted-foreground">In transit</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orders by Status</CardTitle>
            <CardDescription className="text-xs">All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {barData.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  />
                  <Bar dataKey="value" name="Orders" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
              <CardDescription className="text-xs">Latest activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" render={<Link href="/orders" />}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pb-4">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No orders assigned yet</p>
              </div>
            ) : (
              recentOrders.map((o) => {
                const cfg = STATUS_CONFIG[o.status];
                const Icon = cfg?.icon ?? Clock;
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                    <Icon className={cn("h-4 w-4 shrink-0", cfg?.color ?? "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">Order #{o.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(o.createdAt)} · {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {cfg?.label ?? o.status}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">${orderTotal(o.items).toFixed(0)}</span>
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

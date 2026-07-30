"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Bell, ShoppingCart, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  type: "LOW_STOCK" | "EXPIRY" | "ORDER";
  message: string;
  isRead: boolean;
  createdAt: Date;
  product: { name: string } | null;
}

interface Props {
  user: { name: string | null };
  todayMovements: Movement[];
  alerts: Alert[];
  pendingOrders: number;
}

const ALERT_CONFIG = {
  LOW_STOCK: { label: "Low Stock", className: "text-destructive border-destructive/30" },
  EXPIRY: { label: "Expiry", className: "text-warning border-warning/30" },
  ORDER: { label: "Order", className: "text-info border-info/30" },
};

function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EmployeeDashboard({ user, todayMovements, alerts, pendingOrders }: Props) {
  const todayIN = todayMovements.filter((m) => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
  const todayOUT = todayMovements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Good day{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what needs your attention today</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 p-5">
            <TrendingUp className="h-5 w-5 text-success" />
            <p className="text-2xl font-bold tabular-nums text-foreground">{todayIN}</p>
            <p className="text-xs text-muted-foreground">Received today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 p-5">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <p className="text-2xl font-bold tabular-nums text-foreground">{todayOUT}</p>
            <p className="text-xs text-muted-foreground">Dispatched today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 p-5">
            <ShoppingCart className="h-5 w-5 text-warning" />
            <p className="text-2xl font-bold tabular-nums text-foreground">{pendingOrders}</p>
            <p className="text-xs text-muted-foreground">Pending orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's movements */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">My Movements Today</CardTitle>
              <CardDescription className="text-xs">{todayMovements.length} transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" render={<Link href="/stock/movements" />}>
              All movements <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pb-4">
            {todayMovements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No movements recorded today</p>
                <Button size="sm" variant="outline" render={<Link href="/stock/adjust" />}>
                  Record movement
                </Button>
              </div>
            ) : (
              todayMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", m.type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {m.type === "IN" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{m.product?.name ?? "—"}</p>
                    {m.note && <p className="truncate text-xs text-muted-foreground">{m.note}</p>}
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-xs font-medium tabular-nums", m.type === "IN" ? "text-success border-success/30" : "text-destructive border-destructive/30")}>
                    {m.type === "IN" ? "+" : "−"}
                    {m.quantity} {m.product?.unit}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alerts
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {alerts.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">Unread notifications</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" render={<Link href="/alerts" />}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pb-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No unread alerts</p>
              </div>
            ) : (
              alerts.map((a) => {
                const cfg = ALERT_CONFIG[a.type];
                return (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40 transition-colors">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug">{a.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(a.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-xs", cfg.className)}>
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

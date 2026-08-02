"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle2, Info, Package, Plus, Trash2, Check, Filter, RefreshCw, Loader2, Clock, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AlertItem {
  id: string;
  type: "LOW_STOCK" | "EXPIRY" | "ORDER" | "GENERAL" | string;
  message: string;
  isRead: boolean;
  createdAt: string;
  productId?: string | null;
  userId?: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [readFilter, setReadFilter] = useState<string>("all"); // "all" | "unread" | "read"
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Actions states
  const [actionId, setActionId] = useState<string | null>(null);

  // Create Modal (Admin)
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<string>("GENERAL");
  const [newMessage, setNewMessage] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

      if (readFilter === "unread") params.set("isRead", "false");
      if (readFilter === "read") params.set("isRead", "true");
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [readFilter, typeFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Mark single alert as read
  const handleMarkAsRead = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
      });

      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    } finally {
      setActionId(null);
    }
  };

  // Delete alert (Admin only)
  const handleDeleteAlert = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete alert:", err);
    } finally {
      setActionId(null);
    }
  };

  // Create manual alert (Admin only)
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          message: newMessage.trim(),
          productId: newProductId.trim() || undefined,
          userId: newUserId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create alert");
      }

      setAlerts((prev) => [data.alert, ...prev]);
      setCreateOpen(false);
      setNewMessage("");
      setNewProductId("");
      setNewUserId("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "EXPIRATION":
        return <Clock className="w-5 h-5 text-red-500" />;
      case "ORDER":
        return <Package className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-purple-500" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Low Stock</Badge>;
      case "EXPIRATION":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Expiration</Badge>;
      case "ORDER":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Order</Badge>;
      default:
        return <Badge variant="secondary">System</Badge>;
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Bell className="w-8 h-8 text-primary" /> Notifications & Alerts
            {unreadCount > 0 && <Badge className="bg-red-500 text-white rounded-full px-2.5 py-0.5 text-xs">{unreadCount} unread</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Stay updated with inventory warnings, system events, and order activities.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {/* Admin Manual Alert Creator Modal */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateAlert}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" /> Dispatch Manual Alert
                  </DialogTitle>
                  <DialogDescription>Create a custom system alert or notify a specific user/product.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {errorMsg && <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">{errorMsg}</p>}

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={newType} onValueChange={(val) => setNewType(val ?? "SYSTEM")}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL">GENERAL</SelectItem>
                        <SelectItem value="LOW_STOCK">LOW_STOCK</SelectItem>
                        <SelectItem value="EXPIRY">EXPIRY</SelectItem>
                        <SelectItem value="ORDER">ORDER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Alert Message</Label>
                    <Input id="message" placeholder="Type details about this notification..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productId">Target Product ID (Optional)</Label>
                    <Input id="productId" placeholder="Leave empty for global product" value={newProductId} onChange={(e) => setNewProductId(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userId">Target User ID (Optional)</Label>
                    <Input id="userId" placeholder="Leave empty for all users" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />} Send Alert
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" /> Filter Options:
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Read Status Filter */}
            <Select value={readFilter} onValueChange={(val) => setReadFilter(val ?? "all")}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "all")}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Alert Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="EXPIRY">Expiry</SelectItem>
                <SelectItem value="ORDER">Orders</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-semibold">Activity Feed ({alerts.length})</CardTitle>
          <CardDescription>Recent notifications sorted by date</CardDescription>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {loading && alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No alerts found</p>
              <p className="text-xs">There are no notifications matching your current filters.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`p-4 flex items-start justify-between gap-4 transition-colors ${!alert.isRead ? "bg-muted/40 font-medium" : "hover:bg-muted/20"}`}>
                <div className="flex items-start gap-3.5">
                  <div className="p-2 bg-background border rounded-lg shadow-sm shrink-0">{getAlertIcon(alert.type)}</div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getAlertBadge(alert.type)}
                      {!alert.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                      {alert.product && (
                        <span className="text-xs text-muted-foreground">
                          Product: <strong className="text-foreground">{alert.product.name}</strong> (SKU: {alert.product.sku})
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!alert.isRead && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleMarkAsRead(alert.id)} disabled={actionId === alert.id}>
                      {actionId === alert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      Mark Read
                    </Button>
                  )}

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAlert(alert.id)} disabled={actionId === alert.id}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

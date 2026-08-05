"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, Info, Package, Plus, Trash2, Check, Filter, RefreshCw, Loader2, Clock, Send, ChevronLeft, ChevronRight, CheckCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAlerts } from "@/components/providers/alerts-context";
import { useAuth } from "@clerk/nextjs";

interface AlertItem {
  id: string;
  type: "LOW_STOCK" | "EXPIRY" | "ORDER" | "GENERAL" | string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId?: string | null;
  product?: { id: string; name: string; sku: string } | null;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const ITEMS_PER_PAGE = 10;

function AlertIcon({ type }: { type: string }) {
  switch (type) {
    case "LOW_STOCK":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "EXPIRY":
      return <Clock className="w-4 h-4 text-red-500" />;
    case "ORDER":
      return <Package className="w-4 h-4 text-blue-500" />;
    default:
      return <Info className="w-4 h-4 text-purple-500" />;
  }
}

function AlertTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "LOW_STOCK":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]">Low Stock</Badge>;
    case "EXPIRY":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[11px]">Expiry</Badge>;
    case "ORDER":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px]">Order</Badge>;
    default:
      return (
        <Badge variant="secondary" className="text-[11px]">
          General
        </Badge>
      );
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SendAlertDialog({ onSent }: { onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<"user" | "role" | "all">("user");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("employee");
  const [type, setType] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (isMounted) setUsers(data.users ?? []);
      } catch {
        if (isMounted) setUsers([]);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const resetForm = () => {
    setMessage("");
    setSelectedUserId("");
    setSelectedRole("employee");
    setTargetMode("user");
    setType("GENERAL");
    setError(null);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    if (targetMode === "user" && !selectedUserId) {
      setError("Please select a recipient.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        type,
        message: message.trim(),
      };

      if (targetMode === "user") payload.userId = selectedUserId;
      if (targetMode === "role") payload.targetRole = selectedRole;

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to send alert");
      }

      toast.success("Alert sent successfully.");
      setOpen(false);
      resetForm();
      onSent();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter((u) => u.role !== "admin");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-2 h-8 text-xs" />}>
        <Plus className="w-3.5 h-3.5" /> Send Alert
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-primary" /> Dispatch Alert
          </DialogTitle>
          <DialogDescription className="text-xs">Send a notification to a specific user, a role group, or all staff.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">{error}</p>}

          <div className="space-y-2">
            <Label className="text-xs font-medium">Send to</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["user", "role", "all"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMode(m)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all
                    ${targetMode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                >
                  {m === "user" ? "Specific User" : m === "role" ? "Role Group" : "All Staff"}
                </button>
              ))}
            </div>
          </div>

          {targetMode === "user" && (
            <div className="space-y-2">
              <Label htmlFor="recipient" className="text-xs font-medium">
                Recipient
              </Label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading users…
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val ?? "")}>
                  <SelectTrigger id="recipient" className="text-sm">
                    <SelectValue placeholder="Select a user…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                    ) : (
                      filteredUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <span>{u.name ?? u.email}</span>
                            <Badge variant="secondary" className="text-[10px] py-0 h-4 capitalize">
                              {u.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {targetMode === "role" && (
            <div className="space-y-2">
              <Label htmlFor="roleSelect" className="text-xs font-medium">
                Target Role
              </Label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val ?? "employee")}>
                <SelectTrigger id="roleSelect" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> All Employees
                    </div>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" /> All Suppliers
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Sends the alert to every user with this role.</p>
            </div>
          )}

          {targetMode === "all" && <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border border-border">This alert will be visible to all employees and admins as a global notification.</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="alertType" className="text-xs font-medium">
                Alert Type
              </Label>
              <Select value={type} onValueChange={(val) => setType(val ?? "GENERAL")}>
                <SelectTrigger id="alertType" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  <SelectItem value="EXPIRY">Expiry</SelectItem>
                  <SelectItem value="ORDER">Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertMessage" className="text-xs font-medium">
              Message
            </Label>
            <Textarea id="alertMessage" placeholder="Write the alert message…" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="text-sm resize-none" />
            <p className="text-[11px] text-muted-foreground text-right">{message.length} chars</p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button size="sm" className="gap-2 min-w-28" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Sending…" : "Send Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Page
export default function AlertsPage() {
  const { refresh: refreshContext } = useAlerts();
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const isAdmin = role === "admin";

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Action state
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchAlerts = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", String(ITEMS_PER_PAGE));
        if (readFilter === "unread") params.set("isRead", "false");
        if (readFilter === "read") params.set("isRead", "true");
        if (typeFilter !== "all") params.set("type", typeFilter);

        const res = await fetch(`/api/alerts?${params}`);
        if (!res.ok) return;
        const data = await res.json();

        setAlerts(data.alerts ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    },
    [readFilter, typeFilter],
  );

  useEffect(() => {
    
    fetchAlerts(page);
  }, [page, fetchAlerts]);

  // Actions
  const handleMarkAsRead = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "PATCH" });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
        refreshContext();
      }
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Alert deleted.");
        const newTotal = total - 1;
        const newTotalPages = Math.max(1, Math.ceil(newTotal / ITEMS_PER_PAGE));
        const targetPage = page > newTotalPages ? newTotalPages : page;
        setPage(targetPage);
        await fetchAlerts(targetPage);
        refreshContext();
      }
    } finally {
      setActionId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/alerts/bulk", { method: "PATCH" });
      if (res.ok) {
        toast.success("All alerts marked as read.");
        await fetchAlerts(page);
        refreshContext();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/alerts/bulk", { method: "DELETE" });
      if (res.ok) {
        toast.success("All alerts deleted.");
        setPage(1);
        await fetchAlerts(1);
        refreshContext();
      }
    } finally {
      setBulkLoading(false);
      setDeleteAllOpen(false);
    }
  };

  const hasUnread = alerts.some((a) => !a.isRead);

  // Pagination numbers helper 
  function getPageNumbers(): number[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary" />
            Notifications & Alerts
            {total > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {total}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Inventory warnings, order updates, and system events.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAlerts(page)} disabled={loading} className="h-8 text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <SendAlertDialog
              onSent={() => {
                setPage(1);
                fetchAlerts(1);
                refreshContext();
              }}
            />
          )}
        </div>
      </div>

      {/* Filters + Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select
            value={readFilter}
            onValueChange={(val) => {
              setReadFilter(val ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="unread">Unread only</SelectItem>
              <SelectItem value="read">Read only</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="EXPIRY">Expiry</SelectItem>
              <SelectItem value="ORDER">Order</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          {hasUnread && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleMarkAllRead} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
              Mark all read
            </Button>
          )}

          {isAdmin && alerts.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteAllOpen(true)} disabled={bulkLoading}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete all
            </Button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3 border-b ">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
            <span className="text-xs text-muted-foreground">
              {total} alert{total !== 1 ? "s" : ""} total
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading alerts…</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No alerts</p>
              <p className="text-xs mt-1">Nothing matches your current filters.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-4 px-5 py-3.5 transition-colors
                  ${!alert.isRead ? "bg-primary/[0.03]" : "hover:bg-muted/20"}`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 p-1.5 rounded-md border shrink-0
                  ${!alert.isRead ? "bg-background shadow-sm" : "bg-muted/40 border-transparent"}`}
                >
                  <AlertIcon type={alert.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTypeBadge type={alert.type} />
                    {!alert.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    {alert.product && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {alert.product.name}
                        <span className="text-muted-foreground/50 ml-1">#{alert.product.sku}</span>
                      </span>
                    )}
                  </div>

                  <p className={`text-sm leading-relaxed ${!alert.isRead ? "font-medium text-foreground" : "text-foreground/80"}`}>{alert.message}</p>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(alert.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  {!alert.isRead && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs px-2.5" onClick={() => handleMarkAsRead(alert.id)} disabled={actionId === alert.id}>
                      {actionId === alert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-600" />}
                      Read
                    </Button>
                  )}

                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(alert.id)} disabled={actionId === alert.id}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} alerts
          </p>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {getPageNumbers().map((num) => (
              <Button key={num} variant={num === page ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(num)} disabled={loading}>
                {num}
              </Button>
            ))}

            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all alerts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all <strong>{total}</strong> alert{total !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={bulkLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

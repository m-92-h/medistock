"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ShoppingBag, Plus, RefreshCw, Filter, ChevronLeft, ChevronRight, Loader2, Clock, CheckCircle2, XCircle, Truck, PackageCheck, Eye, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

interface Order {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SHIPPED" | "DELIVERED";
  note: string | null;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    email: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchOrders = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", pageNum.toString());
        params.set("limit", "20");

        if (statusFilter !== "ALL") {
          params.set("status", statusFilter);
        }

        const res = await fetch(`/api/orders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
            <Clock className="w-3 h-3" /> Pending Approval
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 gap-1">
            <Truck className="w-3 h-3" /> Shipped
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
            <PackageCheck className="w-3 h-3" /> Delivered
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateTotalAmount = (items: OrderItem[]) => {
    return items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-8 h-8 text-primary" /> Purchase Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage procurement requests, order approvals, and delivery fulfillment.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchOrders(pagination.page)} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Link href="/orders/new">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Create Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" /> Filter Orders:
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-semibold">Orders ({pagination.total})</CardTitle>
          <CardDescription>
            Showing page {pagination.page} of {pagination.pages}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No purchase orders found</p>
              <p className="text-xs">There are no orders matching your current criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-semibold">#{order.id.slice(-8).toUpperCase()}</TableCell>

                    <TableCell>{getStatusBadge(order.status)}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {order.supplier?.name || "N/A"}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">{order.items?.length || 0} product(s)</TableCell>

                    <TableCell className="text-right font-bold text-sm">${calculateTotalAmount(order.items || []).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => fetchOrders(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => fetchOrders(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, Loader2, CheckCircle2, XCircle, Truck, PackageCheck, Building2, User, Clock, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderDetail {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SHIPPED" | "DELIVERED";
  note: string | null;
  createdAt: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  supplier: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
      id: string;
      name: string;
      sku: string;
      unit: string;
    };
  }>;
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { user: clerkUser } = useUser();
  const userRole = clerkUser?.publicMetadata?.role as string | undefined;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      } else {
        setErrorMsg("Failed to load order details");
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setErrorMsg("Network error loading order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleStatusUpdate = async (targetStatus: string) => {
    setUpdating(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      setOrder(data.order);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = () => {
    if (!order?.items) return 0;
    return order.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
        <p className="text-sm">Loading order information...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <p className="text-sm text-muted-foreground">{errorMsg || "The requested order does not exist."}</p>
        <Link href="/orders">
          <Button variant="outline">Back to Orders List</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.id.slice(-8).toUpperCase()}</h1>
            <Badge variant="outline" className="text-xs font-semibold">
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Created on {new Date(order.createdAt).toLocaleString()}</p>
        </div>

        {/* Action Controls (Role-aware based on API responses) */}
        <div className="flex items-center gap-2">
          {updating && <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />}

          {/* Admin فقط: PENDING → APPROVED | REJECTED */}
          {order.status === "PENDING" && userRole === "admin" && (
            <>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={updating} onClick={() => handleStatusUpdate("REJECTED")}>
                <XCircle className="w-4 h-4 mr-1.5" /> Reject Order
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updating} onClick={() => handleStatusUpdate("APPROVED")}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Order
              </Button>
            </>
          )}

          {/* Supplier فقط: APPROVED → SHIPPED */}
          {order.status === "APPROVED" && userRole === "supplier" && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5" disabled={updating} onClick={() => handleStatusUpdate("SHIPPED")}>
              <Truck className="w-4 h-4" /> Mark as Shipped
            </Button>
          )}

          {/* Employee فقط: SHIPPED → DELIVERED */}
          {order.status === "SHIPPED" && userRole === "employee" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={updating} onClick={() => handleStatusUpdate("DELIVERED")}>
              <PackageCheck className="w-4 h-4" /> Confirm Delivery
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Meta Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier Info */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4 text-primary" /> Supplier Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <p className="font-semibold text-base">{order.supplier?.name}</p>
            <p className="text-xs text-muted-foreground">{order.supplier?.email}</p>
            {order.supplier?.phone && <p className="text-xs text-muted-foreground">Phone: {order.supplier.phone}</p>}
          </CardContent>
        </Card>

        {/* Creator Info */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 text-primary" /> Created By
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <p className="font-semibold text-base">{order.createdBy?.name || "System"}</p>
            <p className="text-xs text-muted-foreground">{order.createdBy?.email}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-semibold">Order Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.product.sku}</TableCell>
                  <TableCell className="text-right font-medium">
                    {item.quantity} {item.product.unit || "units"}
                  </TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Note & Summary */}
          <div className="p-4 bg-muted/30 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 text-xs text-muted-foreground max-w-md">
              {order.note && (
                <p className="flex items-start gap-1">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Note:</strong> {order.note}
                  </span>
                </p>
              )}
            </div>

            <div className="text-right w-full md:w-auto">
              <span className="text-xs text-muted-foreground block">Total Order Amount</span>
              <span className="text-2xl font-bold text-primary">${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

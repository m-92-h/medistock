"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft, Edit, Trash2, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, Calendar, Package,
  Building2, DollarSign, Layers, History, CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockMovement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  note?: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface ProductDetails {
  id: string; name: string; sku: string; description?: string;
  unit: string; quantity: number; minQuantity: number; price: number;
  expiryDate?: string;
  category: { name: string };
  supplier: { name: string; email: string; phone?: string };
  stockMovements: StockMovement[];
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }   = use(params);
  const router   = useRouter();

  const { user: clerkUser } = useUser();
  const userRole  = clerkUser?.publicMetadata?.role as string | undefined;
  const canEdit   = userRole === "admin" || userRole === "employee";
  const canDelete = userRole === "admin" || userRole === "employee";

  const [product,       setProduct]       = useState<ProductDetails | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
        } else {
          const data = await res.json().catch(() => ({}));
          setFetchError(data.error || "Failed to load product");
        }
      } catch {
        setFetchError("An unexpected error occurred while loading the product");
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/products");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete product");
      }
    } catch {
      alert("An unexpected error occurred");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-12 text-center text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-2 min-h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Loading product details...</span>
      </div>
    );
  }

  // ─── Fetch Error State ─────────────────────────────────────────────────────
  if (fetchError || !product) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <p className="text-muted-foreground text-sm">
          {fetchError || "Product not found or has been permanently removed."}
        </p>
        <Button variant="outline" render={<Link href="/products" />} className="cursor-pointer text-xs">
          Back to Products List
        </Button>
      </div>
    );
  }

  // ─── Chart Data (آخر 10 حركات مخزن) ──────────────────────────────────────
  const chartData = (product.stockMovements || [])
    .slice(0, 10)
    .reverse()
    .map((m) => ({
      date:     new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Incoming: m.type === "IN"  ? m.quantity : 0,
      Outgoing: m.type === "OUT" ? m.quantity : 0,
    }));

  const isLowStock      = product.quantity > 0 && product.quantity <= product.minQuantity;
  const isOutOfStock    = product.quantity === 0;
  const totalStockValue = Number(product.price || 0) * Number(product.quantity || 0);

  return (
    <div className="p-6 space-y-6 text-left max-w-7xl mx-auto">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline" size="icon"
            render={<Link href="/products" />}
            className="h-9 w-9 rounded-xl cursor-pointer transition-colors"
            aria-label="Back to products"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{product.name}</h1>
              {isOutOfStock ? (
                <Badge variant="destructive" className="text-[10px] font-medium">Out of Stock</Badge>
              ) : isLowStock ? (
                <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10 text-[10px] font-medium">
                  Low Stock
                </Badge>
              ) : (
                <Badge variant="outline" className="border-success/40 text-success bg-success/10 text-[10px] font-medium">
                  In Stock
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              SKU:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px] border border-border/40">
                {product.sku}
              </code>
            </p>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                render={<Link href={`/products/${id}/edit`} />}
                className="gap-2 text-xs cursor-pointer transition-colors"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="gap-2 text-xs cursor-pointer transition-colors"
              >
                {deleteLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Current Stock */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Current Stock <Package className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight flex items-baseline gap-1.5 tabular-nums">
              {product.quantity.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>
            </div>
            {isOutOfStock ? (
              <p className="text-[11px] text-destructive flex items-center gap-1 mt-1 font-medium">
                <AlertTriangle className="w-3 h-3 shrink-0" /> Out of stock
              </p>
            ) : isLowStock ? (
              <p className="text-[11px] text-warning flex items-center gap-1 mt-1 font-medium">
                <AlertTriangle className="w-3 h-3 shrink-0" /> Below alert threshold ({product.minQuantity})
              </p>
            ) : (
              <p className="text-[11px] text-success flex items-center gap-1 mt-1 font-medium">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Above min threshold ({product.minQuantity})
              </p>
            )}
          </CardContent>
        </Card>

        {/* Unit Price & Value */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Unit Price &amp; Value <DollarSign className="w-4 h-4 text-success" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight tabular-nums font-mono">
              ${Number(product.price || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total stock value:{" "}
              <span className="font-semibold text-foreground tabular-nums font-mono">
                ${totalStockValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Taxonomy & Source */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Taxonomy &amp; Source <Layers className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-0.5">
            <div className="text-sm font-semibold truncate text-foreground" title={product.category?.name}>
              {product.category?.name || "Uncategorized"}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={product.supplier?.name}>
              <Building2 className="w-3 h-3 shrink-0" />
              {product.supplier?.name || "N/A"}
            </div>
          </CardContent>
        </Card>

        {/* Expiration Date */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Expiration Date <Calendar className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-semibold text-foreground font-mono">
              {product.expiryDate
                ? new Date(product.expiryDate).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })
                : "Not Specified"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1" title={product.description}>
              {product.description || "No specific storage notes"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Stock Activity Chart ─────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Stock Activity Chart
            </CardTitle>
            <CardDescription className="text-xs">
              Recent inventory inflows (IN) vs outflows (OUT) — last 10 movements
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date" tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      borderColor:     "var(--color-border)",
                      borderRadius:    "8px",
                      fontSize:        "12px",
                      boxShadow:       "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="Incoming" fill="var(--color-success)"     radius={[4, 4, 0, 0]} name="Inflow (IN)"  />
                  <Bar dataKey="Outgoing" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} name="Outflow (OUT)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Movement Log Table ───────────────────────────────────────────────── */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold">Movement Log History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="text-left text-xs font-medium">Type</TableHead>
                <TableHead className="text-left text-xs font-medium">Quantity</TableHead>
                <TableHead className="text-left text-xs font-medium">User</TableHead>
                <TableHead className="text-left text-xs font-medium">Notes</TableHead>
                <TableHead className="text-left text-xs font-medium">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!product.stockMovements || product.stockMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    No stock movements recorded for this item yet.
                  </TableCell>
                </TableRow>
              ) : (
                product.stockMovements.map((movement) => (
                  <TableRow key={movement.id} className="text-xs border-border/30">
                    <TableCell>
                      {movement.type === "IN" ? (
                        <Badge className="bg-success/15 text-success hover:bg-success/20 border-none gap-1 text-[11px] font-medium">
                          <ArrowDownLeft className="w-3 h-3" /> Stock In
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-none gap-1 text-[11px] font-medium">
                          <ArrowUpRight className="w-3 h-3" /> Stock Out
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold tabular-nums font-mono text-foreground">
                      {movement.quantity} {product.unit}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {movement.user?.name || movement.user?.email || "System"}
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground max-w-[200px] truncate"
                      title={movement.note}
                    >
                      {movement.note || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {new Date(movement.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
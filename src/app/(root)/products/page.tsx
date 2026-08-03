"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Plus, Search, AlertTriangle, Package, Edit, Eye, Trash2, Boxes, DollarSign, BarChart3, PieChart as PieIcon, FilterX, ChevronLeft, ChevronRight, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
}
interface Supplier {
  id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number;
  expiryDate?: string;
  category: Category;
  supplier: Supplier;
}
interface Stats {
  totalProducts: number;
  totalLowStock: number;
  totalValue: number;
}

interface DeleteProductDialogProps {
  open: boolean;
  productName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const HEALTHY_COLOR = "var(--color-success)";
const WARNING_COLOR = "var(--color-warning)";
const DANGER_COLOR = "var(--color-destructive)";

export default function ProductsPage() {
  const { user: clerkUser } = useUser();
  const userRole = clerkUser?.publicMetadata?.role as string | undefined;
  const canDelete = userRole === "admin" || userRole === "employee";
  const canAdd = userRole === "admin" || userRole === "employee";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const loading = loadingOptions || loadingProducts;

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [supplierId, setSupplierId] = useState("ALL");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // fetch => [categories + suppliers]
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [catRes, supRes] = await Promise.all([fetch("/api/categories"), fetch("/api/suppliers?isMinimal=true")]);
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data.categories || []);
        }
        if (supRes.ok) {
          const data = await supRes.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setLoadingOptions(false);
      }
    }
    fetchOptions();
  }, []);

  // fetch => /api/products?search=&categoryId=&supplierId=&lowStock=&page=&limit=
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(search && { search }),
        ...(categoryId !== "ALL" && { categoryId }),
        ...(supplierId !== "ALL" && { supplierId }),
        ...(lowStock && { lowStock: "true" }),
      });

      const res = await fetch(`/api/products?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.pages || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [search, categoryId, supplierId, lowStock, page]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Delete project
  const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeletingId(deleteTarget.id);
  try {
    const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Product deleted", {
        description: `"${deleteTarget.name}" has been permanently removed.`,
      });
      await fetchProducts();
    } else {
      const data = await res.json();
      toast.error("Failed to delete product", {
        description: data.error || "An unexpected error occurred.",
      });
    }
  } catch {
    toast.error("Failed to delete product", {
      description: "An unexpected error occurred.",
    });
  } finally {
    setDeletingId(null);
    setDeleteTarget(null);
  }
};

  // ─── Chart Data ───────────────────────────────────────────────────────────
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const name = p.category?.name || "Uncategorized";
      counts[name] = (counts[name] || 0) + p.quantity;
    });
    return Object.entries(counts).map(([name, quantity]) => ({ name, quantity }));
  }, [products]);

  const stockHealthData = useMemo(() => {
    let healthy = 0,
      low = 0,
      outOfStock = 0;
    products.forEach((p) => {
      if (p.quantity === 0) outOfStock++;
      else if (p.quantity <= p.minQuantity) low++;
      else healthy++;
    });
    return [
      { name: "Healthy", value: healthy, color: HEALTHY_COLOR },
      { name: "Low Stock", value: low, color: WARNING_COLOR },
      { name: "Out of Stock", value: outOfStock, color: DANGER_COLOR },
    ].filter((d) => d.value > 0);
  }, [products]);

  const hasActiveFilters = search !== "" || categoryId !== "ALL" || supplierId !== "ALL" || lowStock;

  const resetFilters = () => {
    setSearch("");
    setCategoryId("ALL");
    setSupplierId("ALL");
    setLowStock(false);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6 text-left max-w-[1600px] mx-auto">
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!!deletingId} onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ─── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Product Inventory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Monitor stock health, categorize medical supplies, and manage inventory operations.</p>
        </div>
        {canAdd && (
          <Button className="gap-2 cursor-pointer shadow-sm" render={<Link href="/products/new" />}>
            <Plus className="w-4 h-4" /> Add New Product
          </Button>
        )}
      </div>

      {/* ─── KPI Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/70 bg-card shadow-xs transition-all hover:border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Products</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats?.totalProducts ?? "—"}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card shadow-xs transition-all hover:border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold tracking-tight text-warning">{stats?.totalLowStock ?? "—"}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card shadow-xs transition-all hover:border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Total Value</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats ? `$${stats.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card shadow-xs transition-all hover:border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Categories</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{categories.length}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info/10 text-info">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/70 bg-card shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" /> Stock Distribution by Category
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Total physical unit quantity stored across categories</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {categoryChartData.length === 0 ? (
              <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg bg-muted/20">No inventory data available for chart</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs">
                            <p className="font-semibold text-popover-foreground">{label}</p>
                            <p className="text-primary font-medium mt-1">
                              Quantity: <span className="font-bold">{payload[0].value}</span> units
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="quantity" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <PieIcon className="h-4 w-4 text-primary" /> Stock Health Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">Proportion of healthy vs. critical stock items</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col items-center justify-center">
            {stockHealthData.length === 0 ? (
              <div className="flex h-[180px] w-full items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg bg-muted/20">No stock data available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={stockHealthData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} stroke="var(--color-card)" strokeWidth={2}>
                      {stockHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-border bg-popover p-2 shadow-md text-xs">
                              <span className="font-semibold text-popover-foreground">{d.name}: </span>
                              <span className="font-bold text-foreground">{d.value} items</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-2 pt-2 border-t border-border/40 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    <span className="text-muted-foreground">Healthy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                    <span className="text-muted-foreground">Low Stock</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                    <span className="text-muted-foreground">Out of Stock</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Search & Filters ─────────────────────────────────────────────────── */}
      <Card className="border border-border/70 bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs sm:text-sm bg-background"
              />
            </div>

            <Select
              value={categoryId}
              onValueChange={(val) => {
                setCategoryId(val ?? "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-45 text-xs sm:text-sm bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={supplierId}
              onValueChange={(val) => {
                setSupplierId(val ?? "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-45 text-xs sm:text-sm bg-background">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Suppliers</SelectItem>
                {suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={sup.name}>
                    {sup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={lowStock ? "destructive" : "outline"}
              onClick={() => {
                setLowStock(!lowStock);
                setPage(1);
              }}
              className="gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap"
            >
              <AlertTriangle className="w-4 h-4" />
              {lowStock ? "Low Stock Only" : "Filter Low Stock"}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer" title="Reset Filters">
                <FilterX className="w-4 h-4" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Products Table ────────────────────────────────────────────────────── */}
      <Card className="border border-border/70 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Product</TableHead>
                <TableHead className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">SKU</TableHead>
                <TableHead className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Supplier</TableHead>
                <TableHead className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Quantity</TableHead>
                <TableHead className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Unit Price</TableHead>
                <TableHead className="text-center py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="animate-pulse">
                    <TableCell className="py-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-16" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-16" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="h-7 bg-muted rounded w-16 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs sm:text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium text-foreground">No products found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your filters or search criteria.</p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const isLow = product.quantity > 0 && product.quantity <= product.minQuantity;
                  const isOut = product.quantity === 0;
                  const isDeleting = deletingId === product.id;

                  return (
                    <TableRow key={product.id} className="hover:bg-accent/40 transition-colors">
                      <TableCell className="font-medium py-3 px-4">
                        <div className="text-xs sm:text-sm font-semibold text-foreground">{product.name}</div>
                        <span className="text-[11px] text-muted-foreground">Unit: {product.unit}</span>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <code className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[11px] font-mono border border-border/50">{product.sku}</code>
                      </TableCell>

                      <TableCell className="text-xs sm:text-sm py-3 px-4 text-muted-foreground font-medium">{product.category?.name ?? "—"}</TableCell>

                      <TableCell className="text-xs sm:text-sm py-3 px-4 text-muted-foreground">{product.supplier?.name ?? "—"}</TableCell>

                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold tabular-nums text-xs sm:text-sm", isOut && "text-destructive", isLow && "text-warning", !isOut && !isLow && "text-foreground")}>{product.quantity}</span>
                          {isOut ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Out of Stock
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-warning border-warning/40 bg-warning/10 gap-1 font-medium">
                              <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-success border-success/40 bg-success/10 gap-1 font-medium">
                              <ShieldCheck className="w-2.5 h-2.5" /> Healthy
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs sm:text-sm py-3 px-4 tabular-nums font-semibold text-foreground">${Number(product.price).toFixed(2)}</TableCell>

                      <TableCell className="text-center py-3 px-4">
                        <div className="flex justify-center items-center gap-1">
                          <Button size="icon" variant="ghost" title="View Details" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted" render={<Link href={`/products/${product.id}`} />}>
                            <Eye className="w-4 h-4" />
                          </Button>

                          {canDelete && (
                            <>
                              <Button size="icon" variant="ghost" title="Edit Product" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted" render={<Link href={`/products/${product.id}/edit`} />}>
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                title="Delete Product"
                                disabled={isDeleting}
                                onClick={() => setDeleteTarget(product)}
                                className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── Pagination ───────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-semibold text-foreground">{page}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="text-xs cursor-pointer gap-1 h-8">
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="text-xs cursor-pointer gap-1 h-8">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  PackagePlus,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Option {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    unit: "Box",
    quantity: 0,
    minQuantity: 10,
    price: "",
    expiryDate: "",
    categoryId: "",
    supplierId: "",
  });

  // Fetch metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [catRes, supRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/suppliers"),
        ]);
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data.categories || data);
        }
        if (supRes.ok) {
          const data = await supRes.json();
          setSuppliers(data.suppliers || data);
        }
      } catch (err) {
        console.error("Failed to load select metadata", err);
      }
    }
    loadMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          minQuantity: Number(form.minQuantity),
          price: Number(form.price),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      router.push("/products");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculations & States
  const totalStockValue = Number(form.price || 0) * Number(form.quantity || 0);
  const isLowInitialStock = Number(form.quantity) <= Number(form.minQuantity);
  const selectedCategoryName = categories.find((c) => c.id === form.categoryId)?.name;
  const selectedSupplierName = suppliers.find((s) => s.id === form.supplierId)?.name;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-9 w-9 rounded-xl cursor-pointer transition-colors duration-200"
            aria-label="Back to products list"
          >
            <Link href="/products">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Add New Product
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Register new pharmaceutical or medical inventory item to the warehouse.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs sm:text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-primary" /> Basic Information
              </CardTitle>
              <CardDescription className="text-xs">
                Essential item identifiers and taxonomy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-xs font-medium">
                    SKU Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sku"
                    required
                    placeholder="e.g. MED-10023"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="text-xs sm:text-sm font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category-select" className="text-xs font-medium">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(val) => setForm({ ...form, categoryId: val })}
                  >
                    <SelectTrigger id="category-select" className="text-xs sm:text-sm cursor-pointer">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-select" className="text-xs font-medium">
                    Primary Supplier <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.supplierId}
                    onValueChange={(val) => setForm({ ...form, supplierId: val })}
                  >
                    <SelectTrigger id="supplier-select" className="text-xs sm:text-sm cursor-pointer">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="cursor-pointer">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Stock Details */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Stock & Pricing
              </CardTitle>
              <CardDescription className="text-xs">
                Set initial batch quantities, minimum thresholds, and prices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-xs font-medium">
                    Unit of Measure
                  </Label>
                  <Input
                    id="unit"
                    placeholder="Box, Bottle, Strip..."
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-medium">
                    Unit Price ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="text-xs sm:text-sm tabular-nums font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate" className="text-xs font-medium">
                    Expiration Date
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="text-xs sm:text-sm cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-xs font-medium">
                    Initial Stock Quantity
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="text-xs sm:text-sm tabular-nums font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minQuantity" className="text-xs font-medium">
                    Low Stock Threshold (Alert)
                  </Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    min="0"
                    value={form.minQuantity}
                    onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
                    className="text-xs sm:text-sm tabular-nums font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="description" className="text-xs font-medium">
                  Description & Storage Guidelines
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Notes regarding storage conditions, special handling, or active ingredients..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="text-xs sm:text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              asChild
              className="text-xs sm:text-sm cursor-pointer transition-colors duration-200"
            >
              <Link href="/products">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 text-xs sm:text-sm cursor-pointer transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Product
            </Button>
          </div>
        </div>

        {/* Live Product Preview Widget */}
        <div className="space-y-6">
          <Card className="border border-border/60 bg-muted/20 backdrop-blur-sm sticky top-6 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Product Card Preview</span>
                <Badge variant="outline" className="text-[10px] font-normal border-primary/30 text-primary bg-primary/5">
                  Live View
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Product Identity */}
              <div>
                <h3 className="text-base font-bold text-foreground truncate">
                  {form.name || "Untitled Product"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border/40">
                    {form.sku || "SKU-XXXXX"}
                  </code>
                  <span className="text-xs text-muted-foreground">• Unit: {form.unit || "N/A"}</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Category
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[140px]" title={selectedCategoryName}>
                    {selectedCategoryName || "—"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> Supplier
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[140px]" title={selectedSupplierName}>
                    {selectedSupplierName || "—"}
                  </span>
                </div>

                {form.expiryDate && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> Expiration
                    </span>
                    <span className="font-medium text-foreground font-mono">{form.expiryDate}</span>
                  </div>
                )}
              </div>

              {/* Financial Calculation Summary */}
              <div className="border-t border-border/40 pt-3 space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="font-semibold text-foreground tabular-nums font-mono">
                    ${Number(form.price || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-muted-foreground">Initial Quantity:</span>
                  <span className="font-semibold text-foreground tabular-nums font-mono">
                    {form.quantity} {form.unit}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm pt-2 font-bold border-t border-border/30">
                  <span>Estimated Batch Value:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                    ${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Initial Stock Status Indicator */}
              <div className="border-t border-border/40 pt-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Expected Inventory Health:
                </p>
                {isLowInitialStock ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Low Stock Alert on creation</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Healthy Initial Stock Level</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
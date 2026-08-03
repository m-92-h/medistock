"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Option {
  id: string;
  name: string;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { user: clerkUser, isLoaded } = useUser();
  const userRole = clerkUser?.publicMetadata?.role as string | undefined;

  useEffect(() => {
    if (isLoaded && userRole === "supplier") {
      router.replace("/dashboard");
    }
  }, [isLoaded, userRole, router]);

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    unit: "Unit",
    minQuantity: 10,
    price: "",
    expiryDate: "",
    categoryId: "",
    supplierId: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes, supRes] = await Promise.all([fetch(`/api/products/${id}`), fetch("/api/categories"), fetch("/api/suppliers")]);

        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data.categories || data);
        }
        if (supRes.ok) {
          const data = await supRes.json();
          setSuppliers(data.suppliers || data);
        }

        if (prodRes.ok) {
          const { product } = await prodRes.json();
          setForm({
            name: product.name || "",
            sku: product.sku || "",
            description: product.description || "",
            unit: product.unit || "Unit",
            minQuantity: product.minQuantity ?? 10,
            price: product.price != null ? String(product.price) : "",
            expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split("T")[0] : "",
            categoryId: product.categoryId || "",
            supplierId: product.supplierId || "",
          });
        } else {
          const data = await prodRes.json().catch(() => ({}));
          setError(data.error || "Failed to load product details. Item may not exist.");
        }
      } catch {
        setError("An error occurred while fetching product data.");
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = Number(form.price);
    if (!form.price || isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Please enter a valid price (must be 0 or greater).");
      return;
    }

    const parsedMin = Number(form.minQuantity);
    if (isNaN(parsedMin) || parsedMin < 0) {
      setError("Low stock threshold must be 0 or greater.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          minQuantity: parsedMin,
          price: parsedPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product details");

      router.push(`/products/${id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading States ────────────────────────────────────────────────────────
  if (!isLoaded || (isLoaded && userRole === "supplier")) {
    return (
      <div className="p-12 text-center text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-2 min-h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Redirecting...</span>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="p-12 text-center text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-2 min-h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Loading product information...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-left">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" render={<Link href={`/products/${id}`} />} className="h-9 w-9 rounded-xl cursor-pointer transition-colors" aria-label="Back to product details">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Product</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Update specifications, stock thresholds, and details for this medical item</p>
        </div>
      </div>

      {/* ─── Error Alert ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-destructive/15 text-destructive border border-destructive/20 rounded-lg text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Form ────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-semibold">Product Specification</CardTitle>
            <CardDescription className="text-xs">Modify core properties and inventory alerting configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Name & SKU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" required placeholder="e.g., Amoxicillin 500mg Capsule" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs font-medium">
                  SKU / Code <span className="text-destructive">*</span>
                </Label>
                <Input id="sku" required placeholder="e.g., MED-AMX-500" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} className="text-xs font-mono" />
              </div>
            </div>

            {/* Category & Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.categoryId} onValueChange={(val) => setForm({ ...form, categoryId: val ?? "" })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Primary Supplier</Label>
                <Select value={form.supplierId} onValueChange={(val) => setForm({ ...form, supplierId: val ?? "" })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit, Price & Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs font-medium">
                  Unit of Measure
                </Label>
                <Input id="unit" placeholder="e.g., Box, Pack, Bottle" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs font-medium">
                  Unit Price ($) <span className="text-destructive">*</span>
                </Label>
                <Input id="price" type="number" step="0.01" min="0" required placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="text-xs font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiryDate" className="text-xs font-medium">
                  Expiration Date
                </Label>
                <Input id="expiryDate" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="text-xs font-mono" />
              </div>
            </div>

            {/* Min Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="minQuantity" className="text-xs font-medium">
                Low Stock Alert Threshold
              </Label>
              <Input id="minQuantity" type="number" min="0" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })} className="text-xs font-mono max-w-xs" />
              <p className="text-[11px] text-muted-foreground">Triggers a warning when current inventory drops to or below this level.</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">
                Description &amp; Instructions
              </Label>
              <Textarea id="description" rows={3} placeholder="Enter additional details or handling instructions..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-xs resize-y" />
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end items-center gap-3 border-t border-border/40">
              <Button type="button" variant="outline" render={<Link href={`/products/${id}`} />} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2 text-xs cursor-pointer">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

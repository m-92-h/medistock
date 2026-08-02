"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Plus, Trash2, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  unit: string;
}

interface OrderItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewOrderPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<OrderItemRow[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Suppliers & Products
  useEffect(() => {
    async function initData() {
      try {
        const [supRes, prodRes] = await Promise.all([fetch("/api/suppliers?minimal"), fetch("/api/products?limit=100")]);

        if (supRes.ok) {
          const supData = await supRes.json();
          setSuppliers(supData || []);
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }
      } catch (err) {
        console.error("Error loading dependencies:", err);
      } finally {
        setLoadingData(false);
      }
    }

    initData();
  }, []);

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string | null) => {
    const actualId = productId ?? "";
    const matchedProduct = products.find((p) => p.id === actualId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: actualId,
      unitPrice: matchedProduct ? matchedProduct.price : 0,
    };
    setItems(updated);
  };

  const handleRowChange = (index: number, field: "quantity" | "unitPrice", value: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: Math.max(0, value),
    };
    setItems(updated);
  };

  const totalAmount = items.reduce((acc, curr) => acc + (curr.quantity || 0) * (curr.unitPrice || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg("Please select a supplier");
      return;
    }

    if (items.some((i) => !i.productId || i.quantity <= 0)) {
      setErrorMsg("Please complete all product rows with valid quantities");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          note: note.trim() || undefined,
          items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      router.push(`/orders/${data.order.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
        <p className="text-sm">Preparing order form...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" /> Create Purchase Order
            </CardTitle>
            <CardDescription>Submit a formal purchase request to a supplier for replenishment.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Supplier & Note Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier Target</Label>
                <Select value={selectedSupplierId} onValueChange={(val) => setSelectedSupplierId(val ?? "")}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Order Note / Instructions (Optional)</Label>
                <Input id="note" placeholder="e.g. Urgent shipment needed before next week" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            {/* Order Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Order Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((row, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-end gap-3 p-3 bg-muted/40 border rounded-lg">
                    {/* Select Product */}
                    <div className="flex-1 space-y-1.5 w-full">
                      <Label className="text-xs text-muted-foreground">Product</Label>
                      <Select value={row.productId} onValueChange={(val) => handleProductSelect(idx, val)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-28 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input type="number" min="1" className="h-9" value={row.quantity} onChange={(e) => handleRowChange(idx, "quantity", Number(e.target.value))} />
                    </div>

                    {/* Unit Price */}
                    <div className="w-full sm:w-32 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Unit Price ($)</Label>
                      <Input type="number" step="0.01" className="h-9" value={row.unitPrice} onChange={(e) => handleRowChange(idx, "unitPrice", Number(e.target.value))} />
                    </div>

                    {/* Subtotal preview */}
                    <div className="w-full sm:w-28 text-right self-center pt-3 sm:pt-0">
                      <span className="text-xs text-muted-foreground block">Subtotal</span>
                      <span className="text-sm font-bold">${(row.quantity * row.unitPrice).toFixed(2)}</span>
                    </div>

                    {/* Remove Row */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer Banner */}
            <div className="p-4 bg-muted/60 border rounded-lg flex items-center justify-between">
              <span className="font-semibold text-sm">Estimated Total Order Cost</span>
              <span className="text-2xl font-bold text-primary">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t p-4">
            <Button type="button" variant="outline" onClick={() => router.push("/orders")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Order...
                </>
              ) : (
                <>Submit Purchase Order</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

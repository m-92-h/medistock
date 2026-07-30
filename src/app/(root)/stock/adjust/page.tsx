"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Package, PlusCircle, Loader2, CheckCircle2, AlertCircle, ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
}

export default function StockAdjustPage() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form States
  const [selectedProductId, setSelectedProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState<number | "">("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Product Information
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Fetch Products for Dropdown
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products?limit=100");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || Number(quantity) <= 0) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          type,
          quantity: Number(quantity),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record stock movement");
      }

      setSuccessMsg(`Movement recorded successfully! (${type} ${quantity} units)`);
      setQuantity("");
      setNote("");

      // Redirect back to movements page after 1.5s
      setTimeout(() => {
        router.push("/stock/movements");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Top Navigation */}
      <Link href="/stock/movements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Stock Movements
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" /> Record Stock Movement
          </CardTitle>
          <CardDescription>Register inbound inventory receipt (IN) or dispatch stock out (OUT).</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Alerts */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product">Select Product</Label>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading products...
                </div>
              ) : (
                <Select value={selectedProductId} onValueChange={(val) => setSelectedProductId(val ?? "")}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Choose a product from inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — In Stock: {p.quantity} {p.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Selected Product Stock Card preview */}
            {selectedProduct && (
              <div className="p-3 bg-muted/50 border rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{selectedProduct.name}</span>
                </div>
                <div>
                  Available Stock:{" "}
                  <strong className="text-foreground text-sm">
                    {selectedProduct.quantity} {selectedProduct.unit}
                  </strong>
                </div>
              </div>
            )}

            {/* Movement Type Selection */}
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={type === "IN" ? "default" : "outline"}
                  className={`h-11 gap-2 ${type === "IN" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => setType("IN")}
                >
                  <ArrowDownLeft className="w-4 h-4" /> Stock IN (Receipt)
                </Button>

                <Button
                  type="button"
                  variant={type === "OUT" ? "default" : "outline"}
                  className={`h-11 gap-2 ${type === "OUT" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                  onClick={() => setType("OUT")}
                >
                  <ArrowUpRight className="w-4 h-4" /> Stock OUT (Dispatch)
                </Button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="1" placeholder="e.g. 50" value={quantity} onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} required />
            </div>

            {/* Note / Reason */}
            <div className="space-y-2">
              <Label htmlFor="note">Reason / Note (Optional)</Label>
              <div className="relative">
                <FileText className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input id="note" placeholder="e.g. Shipment received, damaged items, customer order..." className="pl-9" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button type="submit" disabled={submitting || !selectedProductId || !quantity} className="w-full gap-2">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording Transaction...
                </>
              ) : (
                <>Save Movement</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  PlusCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Boxes,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Projected Quantity Calculation
  const numQty = typeof quantity === "number" ? quantity : 0;
  const projectedStock = selectedProduct
    ? type === "IN"
      ? selectedProduct.quantity + numQty
      : selectedProduct.quantity - numQty
    : 0;

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

      setSuccessMsg(
        `Movement recorded successfully! (${type} ${quantity} units)`
      );
      setQuantity("");
      setNote("");

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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-4 sm:p-8 md:p-12 transition-all">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Top Bar */}
        <div>
          <Link
            href="/stock/movements"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stock Movements</span>
          </Link>
        </div>

        {/* Main Card */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="space-y-2 border-b border-slate-100 dark:border-slate-800/80 p-6 sm:p-8 bg-slate-50/30 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  Record Stock Movement
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Register inbound inventory receipt (IN) or dispatch stock out (OUT).
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Feedback Alerts */}
              {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm flex items-start gap-3 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 rounded-xl text-sm flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Product Selection */}
              <div className="space-y-2.5">
                <Label htmlFor="product" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Product <span className="text-rose-500">*</span>
                </Label>
                {loadingProducts ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 p-3.5 border rounded-xl bg-slate-50 dark:bg-slate-800/30 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading inventory products...
                  </div>
                ) : (
                  <Select
                    value={selectedProductId}
                    onValueChange={(val) => setSelectedProductId(val ?? "")}
                  >
                    <SelectTrigger
                      id="product"
                      className="h-12 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 text-start cursor-pointer transition-all"
                    >
                      <SelectValue placeholder="Choose a product from inventory..." />
                    </SelectTrigger>

                    <SelectContent
                      align="start"
                      sideOffset={6}
                      className="w-[var(--radix-select-trigger-width)] max-h-64 p-1.5 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
                    >
                      {products.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          className="cursor-pointer py-3 px-3 focus:bg-slate-100 dark:focus:bg-slate-800 rounded-lg my-0.5 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                                {p.name}
                              </span>
                              <span className="text-xs text-slate-400 font-mono mt-0.5">
                                SKU: {p.sku}
                              </span>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                              {p.quantity} {p.unit}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected Product Interactive Preview */}
              {selectedProduct && (
                <div className={`p-4 rounded-xl border transition-all duration-300 ${
                  type === "IN" 
                    ? "bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                    : "bg-rose-50/40 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/40"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${type === "IN" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"}`}>
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Product Status</p>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedProduct.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Current Stock</span>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {selectedProduct.quantity} {selectedProduct.unit}
                        </span>
                      </div>

                      {numQty > 0 && (
                        <>
                          <div className="text-slate-300 dark:text-slate-700">➔</div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs text-slate-500 dark:text-slate-400 block">After Adjustment</span>
                            <span className={`font-bold text-sm ${projectedStock < 0 ? "text-rose-600" : "text-slate-900 dark:text-slate-100"}`}>
                              {projectedStock} {selectedProduct.unit}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Movement Type Selection Buttons */}
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Movement Type <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-11 rounded-lg gap-2 text-sm font-semibold transition-all ${
                      type === "IN"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    }`}
                    onClick={() => setType("IN")}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Stock IN </span><span className="hidden sm:flex">(Receipt)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-11 rounded-lg gap-2 text-sm font-semibold transition-all ${
                      type === "OUT"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    }`}
                    onClick={() => setType("OUT")}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>Stock OUT </span> <span className="hidden sm:flex">(Dispatch)</span>
                  </Button>
                </div>
              </div>

              {/* Quantity Field */}
              <div className="space-y-2.5">
                <Label htmlFor="quantity" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Quantity <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  className="h-12 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-base"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
              </div>

              {/* Note / Reason Field */}
              <div className="space-y-2.5">
                <Label htmlFor="note" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Reason / Note <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <Input
                    id="note"
                    placeholder="e.g. Supplier shipment, damaged items, order #1082..."
                    className="h-12 pl-10 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 sm:p-8 pt-0">
              <Button
                type="submit"
                disabled={submitting || !selectedProductId || !quantity}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Recording Transaction...</span>
                  </div>
                ) : (
                  <span>Save Movement</span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
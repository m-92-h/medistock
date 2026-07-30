"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    unit: "قطعة",
    quantity: 0,
    minQuantity: 10,
    price: "",
    expiryDate: "",
    categoryId: "",
    supplierId: "",
  });

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [catRes, supRes] = await Promise.all([fetch("/api/categories"), fetch("/api/suppliers")]);
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
      if (!res.ok) throw new Error(data.error || "حدث خطأ أثناء حفظ المنتج");

      router.push("/products");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 dir-rtl text-right">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" render={<Link href="/products" />}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">إضافة منتج جديد</h1>
          <p className="text-sm text-muted-foreground">أدخل تفاصيل العنصر الطبي لإضافته للمخزون</p>
        </div>
      </div>

      {error && <div className="p-4 bg-destructive/15 text-destructive rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">معلومات المنتج الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المنتج *</Label>
                <Input id="name" required placeholder="مثال: الباراسيتامول 500 ملغ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">رمز المنتج (SKU) *</Label>
                <Input id="sku" required placeholder="MED-10023" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select value={form.categoryId} onValueChange={(val) => setForm({ ...form, categoryId: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المورد الرئيسي *</Label>
                <Select value={form.supplierId} onValueChange={(val) => setForm({ ...form, supplierId: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد" />
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">وحدة القياس</Label>
                <Input id="unit" placeholder="علبة، قطعة، زجاجة..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">السعر الإفرادي ($) *</Label>
                <Input id="price" type="number" step="0.01" required placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">تاريخ انتهاء الصلاحية</Label>
                <Input id="expiryDate" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">الكمية الافتتاحية الأولية</Label>
                <Input id="quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minQuantity">حد التنبيه (أدنى كمية)</Label>
                <Input id="minQuantity" type="number" min="0" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف والتعليمات</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="ملاحظات حول ظروف التخزين أو التفاصيل الأخرى..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" render={<Link href="/products" />}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ المنتج
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

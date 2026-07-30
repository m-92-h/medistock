"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Edit, Trash, AlertTriangle, ArrowUpRight, ArrowDownLeft, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface StockMovement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  note?: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface ProductDetails {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number;
  expiryDate?: string;
  category: { name: string };
  supplier: { name: string; email: string; phone?: string };
  stockMovements: StockMovement[];
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف هذا المنتج؟")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/products");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "تعذر حذف المنتج");
      }
    } catch (err) {
      alert("حدث خطأ غير متوقع");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center dir-rtl">جاري التحميل...</div>;
  if (!product) return <div className="p-8 text-center dir-rtl">المنتج غير موجود</div>;

  // Recharts aggregation data
  const chartData = product.stockMovements
    .slice(0, 10)
    .reverse()
    .map((m) => ({
      date: new Date(m.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
      وارد: m.type === "IN" ? m.quantity : 0,
      صادر: m.type === "OUT" ? m.quantity : 0,
    }));

  return (
    <div className="p-6 space-y-6 dir-rtl text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" render={<Link href="/products" />}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              رمز SKU: <code className="bg-muted px-1.5 py-0.5 rounded">{product.sku}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" render={<Link href={`/products/${id}/edit`} />}>
            <Edit className="w-4 h-4" /> تعديل
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading} className="gap-2">
            <Trash className="w-4 h-4" /> حذف
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الكمية المتاحة</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold flex items-center gap-2">
              {product.quantity} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>
            </div>
            {product.quantity <= product.minQuantity && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" /> أدنى من حد التنبيه ({product.minQuantity})
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">السعر الإفرادي</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{Number(product.price).toFixed(2)} $</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الفئة والمورد</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-semibold">{product.category?.name}</div>
            <div className="text-xs text-muted-foreground">{product.supplier?.name}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تاريخ الصلاحية</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-semibold flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("ar-EG") : "غير محدد"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">مخطط حركة المخزون الأخيرة</CardTitle>
            <CardDescription>مقارنة بين الكميات الواردة والصادرة في آخر الحركات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="وارد" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="صادر" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Movements History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سجل الحركات (Stock Movements)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نوع الحركة</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">الملاحظات</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.stockMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    لا توجد حركات تسجيل لهذه المادة حتى الآن
                  </TableCell>
                </TableRow>
              ) : (
                product.stockMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {movement.type === "IN" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-none gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> وارد
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-none gap-1">
                          <ArrowUpRight className="w-3 h-3" /> صادر
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold">{movement.quantity}</TableCell>
                    <TableCell>{movement.user?.name || movement.user?.email}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{movement.note || "—"}</TableCell>
                    <TableCell className="text-xs dir-ltr text-right">{new Date(movement.createdAt).toLocaleString("ar-EG")}</TableCell>
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

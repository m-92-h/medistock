"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Filter, AlertTriangle, Package, Edit, Eye, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number;
  expiryDate?: string;
  category: { id: string; name: string };
  supplier: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}
interface Supplier {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [supplierId, setSupplierId] = useState("ALL");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Metadata
  useEffect(() => {
    async function fetchOptions() {
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
      } catch (error) {
        console.error("Failed to load options", error);
      }
    }
    fetchOptions();
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
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
        setProducts(data.products);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, supplierId, lowStock, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  return (
    <div className="p-6 space-y-6 dir-rtl text-right">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المنتجات</h1>
          <p className="text-muted-foreground text-sm">عرض وتصفية جميع المواد والأدوية المتاحة في المخزن الطبي</p>
        </div>
        <Button render={<Link href="/products/new" />} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة منتج جديد
        </Button>
      </div>

      {/* أدوات البحث والفلترة */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="البحث باسم المنتج أو الـ SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>

            <Select value={categoryId} onValueChange={(val) => setCategoryId(val ?? "ALL")}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">جميع الفئات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierId} onValueChange={(val) => setSupplierId(val ?? "ALL")}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">جميع الموردين</SelectItem>
                {suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={sup.id}>
                    {sup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant={lowStock ? "destructive" : "outline"} onClick={() => setLowStock(!lowStock)} className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              {lowStock ? "عرض الكل" : "المخزون المنخفض فقط"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* جدول المنتجات */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">رمز SKU</TableHead>
                <TableHead className="text-right">الفئة</TableHead>
                <TableHead className="text-right">المورد</TableHead>
                <TableHead className="text-right">الكمية الحالية</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    جاري تحميل المنتجات...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد منتجات مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const isLow = product.quantity <= product.minQuantity;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div>{product.name}</div>
                        <span className="text-xs text-muted-foreground">الوحدة: {product.unit}</span>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">{product.sku}</code>
                      </TableCell>
                      <TableCell>{product.category?.name ?? "—"}</TableCell>
                      <TableCell>{product.supplier?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isLow ? "text-destructive font-bold" : ""}>{product.quantity}</span>
                          {isLow && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              منخفض
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{Number(product.price).toFixed(2)} $</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Button size="icon" variant="ghost" render={<Link href={`/products/${product.id}`} />} title="عرض التفاصيل">
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button size="icon" variant="ghost" render={<Link href={`/products/${product.id}/edit`} />} title="تعديل">
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, History, PlusCircle, RefreshCw, Filter, ChevronLeft, ChevronRight, Loader2, Package, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockMovement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  note: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 30,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const fetchMovements = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", pageNum.toString());
        params.set("limit", "30");

        if (typeFilter !== "ALL") {
          params.set("type", typeFilter);
        }

        const res = await fetch(`/api/stock/movements?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setMovements(data.movements || []);
          setPagination(data.pagination || { page: 1, limit: 30, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error("Failed to fetch stock movements:", err);
      } finally {
        setLoading(false);
      }
    },
    [typeFilter],
  );

  useEffect(() => {
    fetchMovements(1);
  }, [fetchMovements]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <History className="w-8 h-8 text-primary" /> Stock Movements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Audit log of all inbound (IN) and outbound (OUT) inventory transactions.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchMovements(pagination.page)} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Link href="/stock/adjust">
            <Button size="sm" className="gap-2">
              <PlusCircle className="w-4 h-4" /> Record Movement
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" /> Filter Transactions:
          </div>

          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "ALL")}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="Movement Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="IN">Inbound (IN)</SelectItem>
                <SelectItem value="OUT">Outbound (OUT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-semibold">Transaction History ({pagination.total})</CardTitle>
          <CardDescription>
            Showing page {pagination.page} of {pagination.pages}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">Loading transactions...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No stock movements recorded</p>
              <p className="text-xs">There are no records matching your filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Executed By</TableHead>
                  <TableHead>Note / Reason</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      {mov.type === "IN" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-semibold">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> IN
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" /> OUT
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{mov.product.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">SKU: {mov.product.sku}</div>
                    </TableCell>

                    <TableCell className="text-right font-bold">
                      <span className={mov.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                        {mov.type === "IN" ? "+" : "-"}
                        {mov.quantity} {mov.product.unit || "units"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{mov.user?.name || "System"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {mov.note ? (
                        <span className="flex items-center gap-1" title={mov.note}>
                          <FileText className="w-3 h-3 shrink-0" />
                          {mov.note}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(mov.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => fetchMovements(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => fetchMovements(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, History, PlusCircle, RefreshCw, Filter, Loader2, Package, User, FileText, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

function buildPageHref(searchParams: URLSearchParams, page: number, typeFilter: string) {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  if (typeFilter !== "ALL") params.set("type", typeFilter);
  return `?${params.toString()}`;
}

function getPaginationRange(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const range: (number | "ellipsis")[] = [1];

  if (currentPage > 3) range.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) range.push(i);

  if (currentPage < totalPages - 2) range.push("ellipsis");

  range.push(totalPages);
  return range;
}

export default function StockMovementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = Number(searchParams.get("page")) || 1;
  const initialType = searchParams.get("type") || "ALL";

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: currentPage,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>(initialType);

  const fetchMovements = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", pageNum.toString());
        params.set("limit", "10");

        if (typeFilter !== "ALL") {
          params.set("type", typeFilter);
        }

        const res = await fetch(`/api/stock/movements?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setMovements(data.movements || []);
          setPagination(data.pagination || { page: pageNum, limit: 10, total: 0, pages: 1 });
        } else {
          toast.error("Failed to fetch stock movements");
        }
      } catch (err) {
        console.error("Failed to fetch stock movements:", err);
        toast.error("An error occurred while fetching movements");
      } finally {
        setLoading(false);
      }
    },
    [typeFilter],
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (val: string) => {
    setTypeFilter(val);
    const params = new URLSearchParams();
    params.set("page", "1");
    if (val !== "ALL") params.set("type", val);
    router.push(`?${params.toString()}`);
  };

  const confirmDelete = async () => {
    if (!selectedMovementId) return;

    const movementId = selectedMovementId;
    setDeletingId(movementId);
    setSelectedMovementId(null);

    try {
      const res = await fetch(`/api/stock/movements?movementId=${movementId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete movement");
        return;
      }

      toast.success("Stock movement deleted and inventory updated successfully.");
      fetchMovements(pagination.page);
    } catch (err) {
      console.error("Failed to delete movement:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchMovements(currentPage);
  }, [fetchMovements, currentPage]);

  const paginationRange = getPaginationRange(pagination.page, pagination.pages);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <History className="w-8 h-8 text-primary" /> Stock Movements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Audit log of all inbound (IN) and outbound (OUT) inventory transactions.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchMovements(pagination.page)} disabled={loading} className="gap-2 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Link href="/stock/adjust">
            <Button size="sm" className="gap-2 cursor-pointer">
              <PlusCircle className="w-4 h-4" /> Record Movement
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Filter className="w-4 h-4 text-primary" />
            <span>Filter Transactions</span>
          </div>

          <div className="w-full sm:w-auto">
            <Select value={typeFilter} onValueChange={(val) => handleFilterChange(val ?? "ALL")}>
              <SelectTrigger className="w-full sm:w-48 h-10 text-sm border-input bg-background cursor-pointer">
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

      {/* Movements Main Section */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold tracking-wide">Transaction History</CardTitle>
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
              Total: {pagination.total}
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Page {pagination.page} of {pagination.pages || 1}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
              <Loader2 className="w-9 h-9 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading transactions...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-16 px-4 text-muted-foreground space-y-2">
              <div className="p-3 bg-muted/50 rounded-full w-fit mx-auto">
                <History className="w-8 h-8 opacity-40" />
              </div>
              <p className="font-semibold text-foreground text-sm">No stock movements recorded</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">There are no transaction records matching your selected filter.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[110px]">Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Executed By</TableHead>
                      <TableHead className="max-w-[220px]">Note / Reason</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mov) => (
                      <TableRow key={mov.id} className="transition-colors hover:bg-muted/50">
                        <TableCell className="align-middle">
                          {mov.type === "IN" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 gap-1 font-semibold text-xs py-1 px-2.5">
                              <ArrowDownLeft className="w-3.5 h-3.5" /> IN
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20 gap-1 font-semibold text-xs py-1 px-2.5">
                              <ArrowUpRight className="w-3.5 h-3.5" /> OUT
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="align-middle">
                          <div className="font-medium text-sm text-foreground flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[180px]">{mov.product.name}</span>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground pl-6">SKU: {mov.product.sku}</div>
                        </TableCell>

                        <TableCell className="align-middle font-bold text-sm">
                          <span className={mov.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {mov.type === "IN" ? "+" : "-"}
                            {mov.quantity} {mov.product.unit || "units"}
                          </span>
                        </TableCell>

                        <TableCell className="align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{mov.user?.name || "System"}</span>
                          </div>
                        </TableCell>

                        <TableCell className="align-middle max-w-[220px]">
                          {mov.note ? (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground truncate" title={mov.note}>
                              <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{mov.note}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        <TableCell className="align-middle text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {new Date(mov.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>

                        <TableCell className="align-middle text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                            onClick={() => setSelectedMovementId(mov.id)}
                            disabled={deletingId === mov.id}
                            title="Delete Movement"
                            aria-label="Delete Movement"
                          >
                            {deletingId === mov.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-border">
                {movements.map((mov) => (
                  <div key={mov.id} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {mov.type === "IN" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 font-semibold text-xs py-0.5">
                              <ArrowDownLeft className="w-3 h-3" /> IN
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 gap-1 font-semibold text-xs py-0.5">
                              <ArrowUpRight className="w-3 h-3" /> OUT
                            </Badge>
                          )}
                          <span className="text-xs font-mono text-muted-foreground">SKU: {mov.product.sku}</span>
                        </div>
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 pt-1">
                          <Package className="w-4 h-4 text-primary shrink-0" />
                          {mov.product.name}
                        </h4>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2 cursor-pointer"
                        onClick={() => setSelectedMovementId(mov.id)}
                        disabled={deletingId === mov.id}
                        aria-label="Delete Movement"
                      >
                        {deletingId === mov.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs bg-muted/40 p-2.5 rounded-lg">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Quantity</span>
                        <span className={`font-bold text-sm ${mov.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {mov.type === "IN" ? "+" : "-"}
                          {mov.quantity} {mov.product.unit || "units"}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">User</span>
                        <span className="font-medium text-foreground flex items-center gap-1 mt-0.5 truncate">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {mov.user?.name || "System"}
                        </span>
                      </div>
                    </div>

                    {mov.note && (
                      <div className="text-xs text-muted-foreground flex items-start gap-1.5 pt-0.5">
                        <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                        <span className="line-clamp-2">{mov.note}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 font-mono border-t border-border/50">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {new Date(mov.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>

        {/* shadcn Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t bg-muted/20">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildPageHref(searchParams, pagination.page - 1, typeFilter)}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pagination.page - 1);
                    }}
                    aria-disabled={pagination.page <= 1 || loading}
                    className={pagination.page <= 1 || loading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {paginationRange.map((item, index) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={buildPageHref(searchParams, item, typeFilter)}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(item);
                        }}
                        isActive={pagination.page === item}
                        aria-disabled={loading}
                        className={loading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    href={buildPageHref(searchParams, pagination.page + 1, typeFilter)}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pagination.page + 1);
                    }}
                    aria-disabled={pagination.page >= pagination.pages || loading}
                    className={pagination.page >= pagination.pages || loading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!selectedMovementId} onOpenChange={(open) => !open && setSelectedMovementId(null)}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">This action cannot be undone. Deleting this movement record will automatically adjust the product stock quantity.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
              Delete Movement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

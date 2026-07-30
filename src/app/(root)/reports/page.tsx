"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, AlertTriangle, FolderKanban, Building2, Users, Bell, ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Loader2, TrendingUp, Activity, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface ReportData {
  kpis: {
    totalProducts: number;
    lowStockProducts: number;
    totalCategories: number;
    totalSuppliers: number;
    totalUsers: number;
    unreadAlerts: number;
  };
  orders: {
    byStatus: Record<string, number>;
  };
  stock: {
    movements: Record<string, { count: number; total: number }>;
  };
  topProducts: Array<{
    product?: {
      id: string;
      name: string;
      sku: string;
      quantity: number;
    };
    totalMoved: number;
  }>;
  recentMovements: Array<{
    id: string;
    type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    createdAt: string;
    product: { id: string; name: string; sku: string };
    user: { id: string; name: string };
  }>;
  charts: {
    orderTrend: Array<{ date: string; count: number }>;
    stockTrend: Array<{ date: string; type: string; total: number }>;
  };
  period: {
    from: string;
    to: string;
  };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Date Filters (Default to start of current month until today)
  const [fromDate, setFromDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        from: new Date(fromDate).toISOString(),
        to: new Date(toDate).toISOString(),
      });
      const res = await fetch(`/api/reports?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Process Stock Movements Trend Chart Data (Group IN/OUT by Date)
  const processedStockTrend = data?.charts.stockTrend
    ? Object.values(
        data.charts.stockTrend.reduce(
          (acc, curr) => {
            if (!acc[curr.date]) {
              acc[curr.date] = { date: curr.date, IN: 0, OUT: 0, ADJUSTMENT: 0 };
            }
            const type = curr.type as "IN" | "OUT" | "ADJUSTMENT";
            if (acc[curr.date][type] !== undefined) {
              acc[curr.date][type] = curr.total;
            }
            return acc;
          },
          {} as Record<string, { date: string; IN: number; OUT: number; ADJUSTMENT: number }>,
        ),
      )
    : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Date Range Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Overview of inventory metrics, order volume, and stock movements</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Range:</span>
          </div>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 h-9 text-xs" />
          <span className="text-muted-foreground text-xs">to</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36 h-9 text-xs" />
          <Button size="sm" variant="outline" onClick={fetchReports} disabled={loading} className="h-9 gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Filter
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Generating reports...</p>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Products</span>
                  <Package className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{data.kpis.totalProducts}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={data.kpis.lowStockProducts > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Low Stock</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.kpis.lowStockProducts}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Categories</span>
                  <FolderKanban className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{data.kpis.totalCategories}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Suppliers</span>
                  <Building2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{data.kpis.totalSuppliers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Users</span>
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{data.kpis.totalUsers}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={data.kpis.unreadAlerts > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
              <CardContent className="p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Unread Alerts</span>
                  <Bell className="w-4 h-4 text-red-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{data.kpis.unreadAlerts}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Order Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Daily Orders Trend
                </CardTitle>
                <CardDescription>Number of orders submitted per day</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {data.charts.orderTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No order data available for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.charts.orderTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} />
                      <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" name="Orders" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Daily Stock Movements (IN vs OUT) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Stock Movements Volume
                </CardTitle>
                <CardDescription>Units received (IN) vs dispatched (OUT)</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {processedStockTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No movement data available for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedStockTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="IN" name="Stock IN" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="OUT" name="Stock OUT" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Summaries & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Moved Products */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Top Fast-Moving Products
                </CardTitle>
                <CardDescription>Products with highest total movement volume</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Moved Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">
                          No product movements recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.topProducts.map((item, idx) => (
                        <TableRow key={item.product?.id || idx}>
                          <TableCell>
                            <div className="font-medium text-sm">{item.product?.name || "Unknown Product"}</div>
                            <div className="text-xs text-muted-foreground">SKU: {item.product?.sku || "N/A"}</div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <Badge variant="outline">{item.totalMoved.toLocaleString()} units</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Movements Activity Feed */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent Stock Activity Log</CardTitle>
                <CardDescription>Latest 10 stock transactions within the selected range</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Executed By</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                          No recent movements found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.recentMovements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            {mov.type === "IN" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                                <ArrowDownLeft className="w-3 h-3" /> IN
                              </Badge>
                            ) : mov.type === "OUT" ? (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                                <ArrowUpRight className="w-3 h-3" /> OUT
                              </Badge>
                            ) : (
                              <Badge variant="secondary">ADJUSTMENT</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{mov.product.name}</TableCell>
                          <TableCell className="font-semibold">{mov.quantity}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{mov.user.name}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(mov.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

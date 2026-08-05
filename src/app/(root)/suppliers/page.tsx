"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Building2, Trash2, Pencil, Loader2, Mail, Phone, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count: {
    products: number;
    orders: number;
  };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Handle Create Supplier
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create supplier");

      setFormData({ name: "", email: "", phone: "" });
      setIsCreateOpen(false);
      fetchSuppliers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Dialog
  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || "",
    });
    setEditError(null);
  };

  // Handle Edit Supplier
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          email: editFormData.email.trim(),
          phone: editFormData.phone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update supplier");

      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setEditError(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Supplier
  const handleDelete = async () => {
    if (!supplierToDelete) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/suppliers/${supplierToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete supplier");

      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter suppliers client-side
  const filteredSuppliers = suppliers.filter((sup) => sup.name.toLowerCase().includes(search.toLowerCase()) || sup.email.toLowerCase().includes(search.toLowerCase()) || (sup.phone && sup.phone.includes(search)));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm">Manage medical vendors, contact details, and inventory supplies</p>
        </div>

        {/* Create Supplier Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>Enter vendor contact information to add them to MediStock.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {createError && <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{createError}</div>}
                <div className="space-y-2">
                  <Label htmlFor="sup-name">Company / Name *</Label>
                  <Input id="sup-name" placeholder="e.g., Pfizer Medical Co." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sup-email">Email Address *</Label>
                  <Input id="sup-email" type="email" placeholder="contact@vendor.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sup-phone">Phone Number</Label>
                  <Input id="sup-phone" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Supplier
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground self-end sm:self-center">
              <Building2 className="w-4 h-4" />
              <span>
                Total Suppliers: <strong>{suppliers.length}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supplier Directory</CardTitle>
          <CardDescription>All registered suppliers with associated product counts and active purchase orders</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading suppliers...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((sup) => (
                  <TableRow key={sup.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{sup.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{sup.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sup.phone ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{sup.phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        <Badge variant="secondary">{sup._count?.products ?? 0}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                        <Badge variant="secondary">{sup._count?.orders ?? 0}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditModal(sup)} title="Edit supplier">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteError(null);
                            setSupplierToDelete(sup);
                          }}
                          title="Delete supplier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>
                Update details for <strong>{editingSupplier?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {editError && <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{editError}</div>}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Company / Name *</Label>
                <Input id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input id="edit-email" type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input id="edit-phone" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{supplierToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{deleteError}</div>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSupplierToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

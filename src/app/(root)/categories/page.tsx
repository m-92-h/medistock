"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Layers, Trash2, Loader2, FolderKanban, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    products: number;
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Create Category
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      setNewCategoryName("");
      setIsCreateOpen(false);
      fetchCategories();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Modal
  const openEdit = (category: Category) => {
    setEditError(null);
    setEditName(category.name);
    setCategoryToEdit(category);
  };

  // Handle Edit Category
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToEdit || !editName.trim()) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/categories/${categoryToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");

      setCategoryToEdit(null);
      fetchCategories();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Category
  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");

      setCategoryToDelete(null);
      fetchCategories();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter categories client-side
  const filteredCategories = categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm">Manage medical product categories and classifications</p>
        </div>

        {/* Create Category Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="w-4 h-4" /> Add Category
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>Create a new category to group medical products.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {createError && <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{createError}</div>}
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name *</Label>
                  <Input id="category-name" placeholder="e.g., Antibiotics, Surgical Supplies..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Stats Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground self-end sm:self-center">
              <FolderKanban className="w-4 h-4" />
              <span>
                Total Categories: <strong>{categories.length}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category List</CardTitle>
          <CardDescription>Overview of all product categories and their item counts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Associated Products</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{category._count?.products ?? 0} products</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(category.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(category)} title="Edit category">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteError(null);
                            setCategoryToDelete(category);
                          }}
                          title="Delete category"
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

      {/* Edit Category Dialog */}
      <Dialog open={!!categoryToEdit} onOpenChange={(open) => !open && setCategoryToEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update the name of this category.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {editError && <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{editError}</div>}
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Category Name *</Label>
                <Input id="edit-category-name" placeholder="e.g., Antibiotics, Surgical Supplies..." value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryToEdit(null)}>
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
      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{deleteError}</div>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCategoryToDelete(null)}>
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

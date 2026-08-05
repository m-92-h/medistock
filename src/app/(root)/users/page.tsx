"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, Trash2, Loader2, Mail, RefreshCw, Pencil, ShieldCheck, Briefcase, Building2, Clock, XCircle, SendHorizonal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "employee" | "supplier";
  isDemo?: boolean;
  createdAt: string;
  supplier?: { id: string; name: string } | null;
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: "pending";
  sentAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    className: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
  },
  employee: {
    label: "Employee",
    icon: Briefcase,
    className: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
  },
  supplier: {
    label: "Supplier",
    icon: Building2,
    className: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  },
} as const;

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
  if (!cfg) return <Badge variant="outline">{role}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["bg-blue-500/15 text-blue-600", "bg-purple-500/15 text-purple-600", "bg-amber-500/15 text-amber-600", "bg-emerald-500/15 text-emerald-600", "bg-rose-500/15 text-rose-600"];

function avatarColor(id: string) {
  const index = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
}

function ConfirmDialog({ open, onOpenChange, onConfirm, loading, title, description, confirmLabel = "Delete" }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  user: UserItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (updated: UserItem) => void;
  onError: (msg: string) => void;
}

function EditUserDialog({ user, open, onOpenChange, onSaved, onError }: EditDialogProps) {
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"admin" | "employee" | "supplier">(user.role);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user.name ?? "");
      setEmail(user.email);
      setRole(user.role);
    }
  }, [open, user]);

  const isDirty = name.trim() !== (user.name ?? "").trim() || email.trim().toLowerCase() !== user.email.toLowerCase() || role !== user.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      onSaved({ ...user, name: data.user.name, email: data.user.email, role: data.user.role });
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit User
            </DialogTitle>
            <DialogDescription>Changes are synced to both Clerk and the database.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-4">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(user.id)}`}>{getInitials(name || null, email)}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          <Separator className="mb-4" />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" placeholder="e.g. Ahmed Hassan" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">
                Email Address
                <span className="ml-1 text-xs text-muted-foreground">(used for login)</span>
              </Label>
              <Input id="edit-email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="employee">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Employee
                    </span>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" /> Supplier
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isDirty} className="gap-2 min-w-25">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  // Confirm delete user
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Confirm revoke invitation
  const [revokeTarget, setRevokeTarget] = useState<InvitationItem | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"employee" | "supplier">("employee");
  const [inviting, setInviting] = useState(false);

  // ── Fetch Users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Invitations ──────────────────────────────────────────────────────
  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const res = await fetch("/api/users/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();

      await fetchInvitations();
    };
    loadData();
  }, [fetchUsers, fetchInvitations]);

  // ── Delete User ────────────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success("User deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
      setDeleteTarget(null);
    } finally {
      setDeletingUser(false);
    }
  };

  // ── Revoke Invitation ──────────────────────────────────────────────────────
  const handleRevokeInvitation = async () => {
    if (!revokeTarget) return;
    setRevokingId(revokeTarget.id);
    try {
      const res = await fetch(`/api/users/invitations/${revokeTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke invitation");
      setInvitations((prev) => prev.filter((i) => i.id !== revokeTarget.id));
      toast.success(`Invitation to ${revokeTarget.email} revoked.`);
      setRevokeTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
      setRevokeTarget(null);
    } finally {
      setRevokingId(null);
    }
  };

  // ── Send Invite ────────────────────────────────────────────────────────────
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");
      toast.success(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail("");
      await fetchInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
      setInviteOpen(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const counts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage system access, roles, and invite new staff or suppliers.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers();
              fetchInvitations();
            }}
            disabled={loading || invitationsLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || invitationsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* ── Invite Dialog ── */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-2" />}>
              <UserPlus className="w-3.5 h-3.5" /> Invite User
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleSendInvite}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Send Invitation
                  </DialogTitle>
                  <DialogDescription>The invited user will receive an email with a sign-up link.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input id="invite-email" type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-role">Assign Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "employee" | "supplier")}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviting} className="gap-2">
                    {inviting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="w-4 h-4" /> Send Invite
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: users.length, color: "text-foreground" },
          { label: "Admins", value: counts.admin ?? 0, color: "text-purple-600" },
          { label: "Employees", value: counts.employee ?? 0, color: "text-blue-600" },
          { label: "Suppliers", value: counts.supplier ?? 0, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* ── Users Table ── */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-3 border-b">
          <CardTitle className="text-base font-semibold">All Users</CardTitle>
          <CardDescription className="text-xs">Click the edit icon to update a user&apos;s name, email, or role.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm">Loading users…</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                      No users found. Invite someone to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="group">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(u.id)}`}>{getInitials(u.name, u.email)}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.name || <span className="text-muted-foreground italic">Unnamed</span>}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>

                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditTarget(u)} title="Edit user">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(u)} title="Delete user">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Invitations Table ── */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Pending Invitations
                {invitations.length > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">{invitations.length}</span>}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Invitations waiting to be accepted. Accepted invitations are removed automatically.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {invitationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm">Loading invitations…</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Mail className="w-8 h-8 opacity-30" />
              <p className="text-sm">No pending invitations.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Sent</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        </span>
                        <span className="text-sm truncate max-w-50">{inv.email}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <RoleBadge role={inv.role} />
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <div className="text-xs text-muted-foreground">
                        <p>{formatDate(inv.sentAt)}</p>
                        <p className="text-muted-foreground/60">{formatRelativeTime(inv.sentAt)}</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => setRevokeTarget(inv)} disabled={revokingId === inv.id} title="Revoke invitation">
                        {revokingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Edit User Dialog ── */}
      {editTarget && (
        <EditUserDialog
          user={editTarget}
          open={!!editTarget}
          onOpenChange={(v) => {
            if (!v) setEditTarget(null);
          }}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setEditTarget(null);
            toast.success("User updated successfully.");
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {/* ── Confirm Delete User ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteUser}
        loading={deletingUser}
        title="Delete User"
        description={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name || deleteTarget.email}"? This action cannot be undone.` : ""}
        confirmLabel="Delete User"
      />

      {/* ── Confirm Revoke Invitation ── */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(v) => {
          if (!v) setRevokeTarget(null);
        }}
        onConfirm={handleRevokeInvitation}
        loading={revokingId !== null}
        title="Revoke Invitation"
        description={revokeTarget ? `Are you sure you want to revoke the invitation sent to "${revokeTarget.email}"?` : ""}
        confirmLabel="Revoke"
      />
    </div>
  );
}

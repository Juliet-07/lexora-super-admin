import { useState } from "react";
import {
  Crown,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────
interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  isOwner: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
}

const emptyForm: UserForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  active: true,
};

const errMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ?? fallback;

// ─── Page ─────────────────────────────────────────────────────
export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/super-admin/admin-users");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : [];
    },
    retry: false,
  });

  const forbidden = (error as any)?.response?.status === 403;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  // ── Mutations ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const base = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      };
      if (editing) {
        return api.patch(`/super-admin/admin-users/${editing._id}`, {
          ...base,
          phone: form.phone.trim(),
          status: form.active ? "active" : "inactive",
        });
      }
      return api.post("/super-admin/admin-users", base);
    },
    onSuccess: (res) => {
      refresh();
      setFormOpen(false);
      if (editing) {
        toast.success("User updated.");
      } else {
        const emailSent = (res.data?.data ?? res.data)?.emailSent;
        if (emailSent === false) {
          toast.warning(
            "User created, but the email with their password couldn't be sent. Use “Reset password” to try again.",
          );
        } else {
          toast.success("User added. Their sign-in details were emailed.");
        }
      }
    },
    onError: (err) => toast.error(errMessage(err, "Could not save user")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/super-admin/admin-users/${id}`),
    onSuccess: () => {
      refresh();
      setDeleteTarget(null);
      toast.success("User deleted.");
    },
    onError: (err) => toast.error(errMessage(err, "Could not delete user")),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/super-admin/admin-users/${id}/reset-password`),
    onSuccess: (res) => {
      setResetTarget(null);
      const emailSent = (res.data?.data ?? res.data)?.emailSent;
      if (emailSent === false) {
        toast.error("The new password was set, but the email failed to send.");
      } else {
        toast.success("A new temporary password was emailed to the user.");
      }
    },
    onError: (err) => toast.error(errMessage(err, "Could not reset password")),
  });

  // ── Helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? "",
      active: u.status === "active",
    });
    setFormOpen(true);
  };

  const canSave =
    form.firstName.trim() && form.lastName.trim() && form.email.trim();

  const set = (k: keyof UserForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Never";

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Users</h1>
          <p className="text-sm text-muted-foreground">
            People who can sign in to this Super Admin console.
          </p>
        </div>
        {!forbidden && (
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        )}
      </div>

      {forbidden ? (
        <div className="bg-card border rounded-xl p-10 text-center space-y-2">
          <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium">
            Only the platform owner can manage users
          </p>
          <p className="text-sm text-muted-foreground">
            Ask the owner of this console to add or change admin users.
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : error ? (
            <p className="p-10 text-center text-sm text-destructive">
              Failed to load users.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last sign-in</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b last:border-0">
                    <td className="p-4">
                      <p className="font-medium">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </p>
                    </td>
                    <td className="p-4">
                      {u.isOwner ? (
                        <Badge className="gradient-primary border-0 gap-1">
                          <Crown className="h-3 w-3" /> Owner
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                          u.status === "active"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {fmt(u.lastLoginAt)}
                    </td>
                    <td className="p-4 text-right">
                      {!u.isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${u.firstName} ${u.lastName}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetTarget(u)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Reset
                              password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-muted-foreground"
                    >
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {editing ? "Edit user" : "Add user"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this user's details, or disable their sign-in."
                : "They'll receive an email with a temporary password and the same access to this console as you, except managing users."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="au-first">First name</Label>
              <Input
                id="au-first"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="au-last">Last name</Label>
              <Input
                id="au-last"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="au-email">Email</Label>
              <Input
                id="au-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="au-phone">Phone (optional)</Label>
              <Input
                id="au-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            {editing && (
              <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="au-active">Can sign in</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn off to block access without deleting the user.
                  </p>
                </div>
                <Switch
                  id="au-active"
                  checked={form.active}
                  onCheckedChange={(v) => set("active", v)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Save changes"
              ) : (
                "Add user"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) =>
          !v && !deleteMutation.isPending && setDeleteTarget(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </strong>{" "}
              will lose access to this console immediately. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget._id);
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password */}
      <AlertDialog
        open={!!resetTarget}
        onOpenChange={(v) =>
          !v && !resetMutation.isPending && setResetTarget(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be emailed to{" "}
              <strong>{resetTarget?.email}</strong>. Their current password
              stops working straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (resetTarget) resetMutation.mutate(resetTarget._id);
              }}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send new password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

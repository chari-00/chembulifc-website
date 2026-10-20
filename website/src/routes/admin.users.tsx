import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  Pencil,
  Trash2,
  Lock,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  User,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { account } from "@/lib/appwrite";
import { pageHead } from "@/lib/page-head";
import {
  listAdminsFn,
  createAdminFn,
  updateAdminFn,
  deleteAdminFn,
  type AdminUserRecord,
} from "@/lib/admin-users.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/users")({
  head: () =>
    pageHead(
      "Manage Admins — Chembuli FC Super Admin",
      "Manage club administrator roles, invitations, and permissions.",
      true
    ),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const navigate = useNavigate();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUserRecord | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Form fields for create
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");

  // Form fields for edit
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // 1. Verify caller super-admin credentials
  useEffect(() => {
    let isMounted = true;
    account
      .get()
      .then((user) => {
        if (!isMounted) return;
        const isSuper = (user.labels || []).includes("superadmin") || user.$id === "chari";
        if (!isSuper) {
          toast.error("Access denied. Super-admin privileges are required.");
          navigate({ to: "/admin", replace: true });
          return;
        }
        setIsSuperAdmin(true);
        setLoadingAuth(false);
        fetchAdmins();
      })
      .catch(() => {
        if (!isMounted) return;
        navigate({ to: "/admin", replace: true });
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function getJwtToken(): Promise<string> {
    const res = await account.createJWT();
    return res.jwt;
  }

  async function fetchAdmins() {
    setLoadingAdmins(true);
    setServerError(null);
    try {
      const jwt = await getJwtToken();
      const res = await listAdminsFn({ data: { jwt } });
      setAdmins(res.admins);
    } catch (err: any) {
      const message = err?.message || "Failed to load admin directory.";
      setServerError(message);
      toast.error(message);
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (createPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setActionBusy(true);
    try {
      const jwt = await getJwtToken();
      await createAdminFn({
        data: {
          jwt,
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
        },
      });
      toast.success(`Admin user "${createName.trim()}" created successfully!`);
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create administrator.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    if (editPassword && editPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setActionBusy(true);
    try {
      const jwt = await getJwtToken();
      await updateAdminFn({
        data: {
          jwt,
          userId: editUser.$id,
          name: editName.trim() || undefined,
          email: editEmail.trim() || undefined,
          password: editPassword || undefined,
        },
      });
      toast.success(`Admin details for "${editUser.name}" updated!`);
      setEditUser(null);
      setEditName("");
      setEditEmail("");
      setEditPassword("");
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update administrator.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    if (deleteUser.$id === "chari" || deleteUser.isSuperAdmin) {
      toast.error("Super-admin account is permanently protected and cannot be deleted.");
      return;
    }

    setActionBusy(true);
    try {
      const jwt = await getJwtToken();
      await deleteAdminFn({
        data: {
          jwt,
          userId: deleteUser.$id,
        },
      });
      toast.success(`Admin "${deleteUser.name}" removed successfully.`);
      setDeleteUser(null);
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete administrator.");
    } finally {
      setActionBusy(false);
    }
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-display tracking-widest uppercase">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          Verifying security privileges…
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="tag-label">Security & Access</span>
            <span className="inline-flex items-center gap-1 bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
              <ShieldCheck className="h-3 w-3" /> Super Admin Console
            </span>
          </div>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold uppercase tracking-tight">
            Administrator Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage authorized tournament directors, staff accounts, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdmins()}
            disabled={loadingAdmins}
            title="Refresh directory"
            className="flex items-center justify-center h-11 w-11 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loadingAdmins ? "animate-spin text-primary" : ""}`} />
          </button>
          <button
            onClick={() => {
              setCreateName("");
              setCreateEmail("");
              setCreatePassword("");
              setCreateOpen(true);
            }}
            className="clip-diag flex items-center gap-2 bg-primary px-5 py-3 font-display font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition-all glow cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add Admin
          </button>
        </div>
      </div>

      {/* Server configuration alert if APPWRITE_API_KEY missing */}
      {serverError && (
        <div className="border border-destructive/50 bg-destructive/10 p-5 rounded-none flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display font-bold uppercase tracking-wider text-destructive">
              Server Configuration Notice
            </h3>
            <p className="text-sm text-foreground/90">{serverError}</p>
            <div className="text-xs text-muted-foreground bg-background/80 p-3 border border-border/50 font-mono">
              To resolve: generate an Appwrite API key with scopes{" "}
              <code className="text-primary">users.read, users.write, teams.read, teams.write</code>{" "}
              and configure <code className="text-primary">APPWRITE_API_KEY=your_key</code> in{" "}
              <code className="text-foreground">website/.env</code>.
            </div>
          </div>
        </div>
      )}

      {/* Admins Table Card */}
      <div className="border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-display text-sm uppercase tracking-wider font-semibold">
              Enrolled Administrators ({admins.length})
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Team: &quot;admins&quot;</span>
        </div>

        {loadingAdmins && admins.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-display tracking-widest uppercase flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            Loading administrators…
          </div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <User className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-display text-lg uppercase tracking-wider">No administrators found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first admin using the &quot;Add Admin&quot; button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 font-display uppercase tracking-wider text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Admin Account</th>
                  <th className="py-3.5 px-4 font-semibold">Role & Access</th>
                  <th className="py-3.5 px-4 font-semibold">Created</th>
                  <th className="py-3.5 px-4 font-semibold">Last Active</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((admin) => (
                  <tr
                    key={admin.$id}
                    className={`hover:bg-muted/20 transition-colors ${
                      admin.isSuperAdmin ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    {/* User Identity */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 flex items-center justify-center font-display font-bold text-sm uppercase border ${
                            admin.isSuperAdmin
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border bg-muted text-foreground"
                          }`}
                        >
                          {admin.name ? admin.name.charAt(0) : "A"}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {admin.name}
                            {admin.isSuperAdmin && (
                              <ShieldCheck className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {admin.email}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground/60">
                            ID: {admin.$id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Access Badge */}
                    <td className="py-4 px-4">
                      {admin.isSuperAdmin ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/40">
                          <Lock className="h-3 w-3" /> Super Admin (Protected)
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-muted text-foreground/80 border border-border">
                          <CheckCircle2 className="h-3 w-3 text-muted-foreground" /> Club Admin
                        </div>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      {new Date(admin.$createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Last Active */}
                    <td className="py-4 px-4 text-xs">
                      {admin.accessedAt ? (
                        <span className="text-foreground">
                          {new Date(admin.accessedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Never signed in</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditUser(admin);
                            setEditName(admin.name);
                            setEditEmail(admin.email);
                            setEditPassword("");
                          }}
                          title="Edit details or reset password"
                          className="p-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {admin.isSuperAdmin || admin.$id === "chari" ? (
                          <button
                            disabled
                            title="Super-admin account is permanently protected and cannot be deleted"
                            className="p-2 border border-border/30 bg-muted/20 text-muted-foreground/30 cursor-not-allowed"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteUser(admin)}
                            title="Delete administrator"
                            className="p-2 border border-border bg-card hover:border-destructive hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD ADMIN DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-primary/40 bg-card p-6 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <UserPlus className="h-5 w-5" />
              <DialogTitle className="font-display text-2xl uppercase tracking-wider font-bold text-foreground">
                Enroll New Admin
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an administrative account with tournament management privileges in the
              &quot;admins&quot; team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 my-2">
            <div>
              <label className="block text-xs uppercase font-display tracking-wider text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-display tracking-wider text-muted-foreground mb-1">
                Email Address
              </label>
              <input
                required
                type="email"
                placeholder="e.g. ramesh@chembulifc.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-display tracking-wider text-muted-foreground mb-1">
                Initial Password (min. 8 characters)
              </label>
              <input
                required
                type="password"
                minLength={8}
                placeholder="••••••••"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The user can change their password later from the admin settings.
              </p>
            </div>

            <div className="bg-muted/40 p-3 border border-border/60 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Security Note:</span> Regular admins
              never receive super-admin labels and cannot modify other users or system settings.
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="border border-input bg-background px-4 py-2 font-display text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="clip-diag bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {actionBusy ? "Enrolling…" : "Create Admin"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ADMIN DIALOG */}
      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="border-primary/40 bg-card p-6 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Pencil className="h-5 w-5" />
              <DialogTitle className="font-display text-2xl uppercase tracking-wider font-bold text-foreground">
                Edit Administrator
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Update credentials or reset password for {editUser?.name}.
            </DialogDescription>
          </DialogHeader>

          {editUser?.isSuperAdmin && (
            <div className="border border-primary/40 bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Editing Super-Admin (Protected Account). Ownership status is locked.</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4 my-2">
            <div>
              <label className="block text-xs uppercase font-display tracking-wider text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                required
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-display tracking-wider text-muted-foreground mb-1">
                Email Address
              </label>
              <input
                required
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase font-display tracking-wider text-muted-foreground">
                  Reset Password
                </label>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <input
                type="password"
                minLength={8}
                placeholder="Leave blank to keep existing password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="border border-input bg-background px-4 py-2 font-display text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="clip-diag bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {actionBusy ? "Saving…" : "Save Changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteUser)} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="border-destructive/40 bg-card p-6 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="font-display text-2xl uppercase tracking-wider font-bold text-foreground">
                Revoke Admin Access
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-foreground/80 mt-2">
              Are you sure you want to permanently delete the administrator account for{" "}
              <strong className="text-foreground">{deleteUser?.name}</strong> (
              <span className="font-mono text-xs">{deleteUser?.email}</span>)?
            </DialogDescription>
          </DialogHeader>

          <div className="border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            This will immediately delete their Appwrite account and revoke all access to tournament
            management and admin pages.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <button
              type="button"
              onClick={() => setDeleteUser(null)}
              className="border border-input bg-background px-4 py-2 font-display text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleDelete}
              className="clip-diag bg-destructive px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-destructive-foreground hover:brightness-110 disabled:opacity-50"
            >
              {actionBusy ? "Deleting…" : "Confirm Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

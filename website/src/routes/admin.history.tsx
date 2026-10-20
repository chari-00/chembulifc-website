import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Code2,
  CalendarDays,
  Tag,
} from "lucide-react";
import { pageHead } from "@/lib/page-head";
import { fetchAdminHistory, type AdminHistoryEntry } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/history")({
  head: () =>
    pageHead(
      "Audit Trail — Chembuli FC Admin",
      "Comprehensive chronological audit log of all administrative actions.",
      true
    ),
  component: AdminHistoryPage,
});

const PAGE_SIZE = 15;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "event.create": { label: "Create Event", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  "event.update": { label: "Update Event", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  "event.delete": { label: "Delete Event", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
  "registration.confirm": { label: "Confirm Team", color: "bg-primary/20 text-primary border-primary/40" },
  "registration.email": { label: "Dispatch Email", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" },
  "registration.delete": { label: "Delete Reg", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
  "gallery.upload": { label: "Upload Photo", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  "gallery.update": { label: "Update Photo", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  "gallery.reorder": { label: "Reorder Photos", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  "gallery.delete": { label: "Delete Photo", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
  "blog.create": { label: "Create Post", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  "blog.update": { label: "Update Post", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  "blog.publish": { label: "Publish Post", color: "bg-primary/20 text-primary border-primary/40" },
  "blog.unpublish": { label: "Unpublish Post", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  "blog.delete": { label: "Delete Post", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
  "admin.create": { label: "Enroll Admin", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" },
  "admin.update": { label: "Modify Admin", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  "admin.delete": { label: "Revoke Admin", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
};

function AdminHistoryPage() {
  const [entries, setEntries] = useState<AdminHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [filterTarget, setFilterTarget] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Inspect Modal
  const [selectedEntry, setSelectedEntry] = useState<AdminHistoryEntry | null>(null);

  async function loadData(currentPage = page) {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;
      const res = await fetchAdminHistory({
        limit: PAGE_SIZE,
        offset,
        targetType: filterTarget || undefined,
        action: filterAction || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
      });
      setEntries(res.entries);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1);
    setPage(1);
  }, [filterTarget, filterAction, startDate, endDate]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadData(newPage);
  };

  const clearFilters = () => {
    setFilterTarget("");
    setFilterAction("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="tag-label">Accountability & Security</span>
            <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">
              <History className="h-3 w-3 text-primary" /> Immutable Audit Log
            </span>
          </div>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold uppercase tracking-tight">
            Administrator Audit Trail
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete trace of all administrative actions, tournament revisions, and account changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(page)}
            disabled={loading}
            title="Refresh logs"
            className="flex items-center justify-center h-11 w-11 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <Filter className="h-3.5 w-3.5 text-primary" /> Filter Audit Log
          </span>
          {(filterTarget || filterAction || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline font-mono"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          {/* Target Category */}
          <div>
            <label className="block text-[10px] uppercase font-display tracking-wider text-muted-foreground mb-1">
              Category
            </label>
            <select
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary [color-scheme:dark]"
            >
              <option value="">All Categories</option>
              <option value="event">Tournaments (event)</option>
              <option value="registration">Registrations</option>
              <option value="photo">Gallery Photos</option>
              <option value="post">Blog Posts</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          {/* Action Enum */}
          <div>
            <label className="block text-[10px] uppercase font-display tracking-wider text-muted-foreground mb-1">
              Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary [color-scheme:dark]"
            >
              <option value="">All Actions</option>
              <option value="event.create">event.create</option>
              <option value="event.update">event.update</option>
              <option value="event.delete">event.delete</option>
              <option value="registration.confirm">registration.confirm</option>
              <option value="registration.email">registration.email</option>
              <option value="registration.delete">registration.delete</option>
              <option value="gallery.upload">gallery.upload</option>
              <option value="gallery.update">gallery.update</option>
              <option value="gallery.delete">gallery.delete</option>
              <option value="blog.create">blog.create</option>
              <option value="blog.update">blog.update</option>
              <option value="blog.publish">blog.publish</option>
              <option value="blog.unpublish">blog.unpublish</option>
              <option value="blog.delete">blog.delete</option>
              <option value="admin.create">admin.create</option>
              <option value="admin.update">admin.update</option>
              <option value="admin.delete">admin.delete</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[10px] uppercase font-display tracking-wider text-muted-foreground mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[10px] uppercase font-display tracking-wider text-muted-foreground mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-display text-sm uppercase tracking-wider font-semibold">
              Action History ({total} recorded)
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground font-display tracking-widest uppercase flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            Loading audit records…
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-display text-lg uppercase tracking-wider">No audit entries found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admin actions will automatically log here as operations occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 font-display uppercase tracking-wider text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Administrator</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Target</th>
                  <th className="py-3.5 px-4 font-semibold">Summary</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => {
                  const badge = ACTION_LABELS[entry.action] || {
                    label: entry.action,
                    color: "bg-muted text-muted-foreground border-border",
                  };
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-none border border-border bg-muted flex items-center justify-center font-display font-bold text-xs uppercase text-primary">
                            {entry.actorName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-foreground">
                              {entry.actorName}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground/70">
                              {entry.actorId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-3 px-4 text-xs font-mono">
                        <span className="text-muted-foreground uppercase text-[10px] block">
                          {entry.targetType}
                        </span>
                        <span className="text-foreground truncate max-w-[140px] block" title={entry.targetId}>
                          {entry.targetId}
                        </span>
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-4 text-xs text-foreground/90 max-w-sm">
                        {entry.summary}
                      </td>

                      {/* Details / Metadata */}
                      <td className="py-3 px-4 text-right">
                        {entry.metadata ? (
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            title="Inspect metadata payload"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-border bg-background hover:border-primary hover:text-primary transition-colors cursor-pointer"
                          >
                            <Code2 className="h-3.5 w-3.5" /> Payload
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-1.5 border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono px-2">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="p-1.5 border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* METADATA INSPECT DIALOG */}
      <Dialog open={Boolean(selectedEntry)} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="border-primary/40 bg-card p-6 max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Code2 className="h-5 w-5" />
              <DialogTitle className="font-display text-xl uppercase tracking-wider font-bold text-foreground">
                Audit Event Metadata
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedEntry?.action} on {selectedEntry?.targetType}:{selectedEntry?.targetId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="bg-muted/40 p-3 border border-border/60 flex items-center justify-between font-mono">
              <span className="text-muted-foreground">Actor:</span>
              <span className="font-semibold text-foreground">
                {selectedEntry?.actorName} ({selectedEntry?.actorId})
              </span>
            </div>

            <div className="bg-background border border-border p-3 rounded font-mono overflow-x-auto max-h-64">
              <pre className="text-primary text-xs">
                {selectedEntry?.metadata
                  ? JSON.stringify(selectedEntry.metadata, null, 2)
                  : "{}"}
              </pre>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Recorded at:{" "}
              {selectedEntry &&
                new Date(selectedEntry.createdAt).toLocaleString("en-IN", {
                  dateStyle: "full",
                  timeStyle: "medium",
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

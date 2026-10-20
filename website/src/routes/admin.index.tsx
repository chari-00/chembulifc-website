import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, statusLabel } from "@/data/events";
import { update, useLiveEvents, logAdminAction } from "@/lib/store";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/admin/")({
  head: () => pageHead("Manage Events — Chembuli FC Admin", "Create and manage Chembuli FC tournaments.", true),
  component: AdminEvents,
});

function AdminEvents() {
  const events = [...useLiveEvents()].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="tag-label">Manage</p>
          <h1 className="text-5xl font-bold uppercase">Events</h1>
        </div>
        <Link
          to="/admin/events/$id"
          params={{ id: "new" }}
          className="clip-diag flex items-center gap-2 bg-primary px-5 py-3 font-display font-bold uppercase tracking-widest text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New event
        </Link>
      </div>
      <div className="mt-8 divide-y divide-border border border-border bg-card">
        {events.length === 0 && <p className="p-6 text-muted-foreground">No events yet.</p>}
        {events.map((e) => (
          <div key={e.slug} className="flex items-center gap-4 p-4">
            <img src={e.poster} alt="" className="h-16 w-14 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold uppercase">{e.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(e.date)} · {e.venue} · {e.registered}/{e.capacity} teams
              </p>
            </div>
            <span
              className={`px-3 py-1 font-display text-xs uppercase tracking-widest ${e.status === "open" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              {statusLabel[e.status]}
            </span>
            <Link
              to="/admin/events/$id"
              params={{ id: e.slug }}
              className="p-2 hover:text-primary"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              aria-label="Delete"
              className="p-2 hover:text-destructive"
              onClick={async () => {
                if (!confirm(`Delete "${e.name}" and its registrations?`)) return;
                try {
                  await update((d) => ({
                    ...d,
                    events: d.events.filter((x) => x.slug !== e.slug),
                    registrations: d.registrations.filter((r) => r.eventSlug !== e.slug),
                  }));
                  logAdminAction(
                    "event.delete",
                    "event",
                    e.slug,
                    `Deleted tournament "${e.name}" and all associated registrations`,
                    { name: e.name, slug: e.slug }
                  ).catch(() => {});
                  toast.success("Event deleted");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

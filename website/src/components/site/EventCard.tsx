import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { type LiveEvent, formatDate, statusLabel } from "@/data/events";

const chip = {
  open: "bg-primary text-primary-foreground",
  upcoming: "bg-secondary text-foreground",
  completed: "bg-muted text-muted-foreground",
};

export function EventCard({ event }: { event: LiveEvent }) {
  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className="group clip-diag relative block overflow-hidden border border-border bg-card transition hover:border-primary hover:glow"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img src={event.poster} alt={event.name} loading="lazy" width={1024} height={1280}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <span className={`absolute left-4 top-4 px-3 py-1 font-display text-xs font-bold uppercase tracking-widest ${chip[event.status]}`}>
          {statusLabel[event.status]}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="tag-label">{event.format}</p>
          <h3 className="mt-1 text-3xl font-bold uppercase leading-none">{event.name}</h3>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" />{formatDate(event.date)}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{event.venue}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-display">
            <span className="text-lg font-bold">₹{event.fee.toLocaleString("en-IN")}<span className="text-xs text-muted-foreground"> / team</span></span>
            <span className="text-sm text-muted-foreground">{event.registered}/{event.capacity} teams</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

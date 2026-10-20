import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AnimatedContent from "@/components/bits/AnimatedContent";
import { EventCard } from "@/components/site/EventCard";
import { type EventStatus } from "@/data/events";
import { useLiveEvents } from "@/lib/store";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Tournaments & Events — Chembuli FC" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Browse open, upcoming and completed Chembuli FC tournaments and register your team.",
      },
      { property: "og:title", content: "Chembuli FC Tournaments" },
      {
        property: "og:description",
        content: "Open, upcoming and completed tournaments by Chembuli FC.",
      },
    ],
  }),
  component: EventsPage,
});

const tabs: { key: EventStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function EventsPage() {
  const [tab, setTab] = useState<EventStatus | "all">("all");
  const events = useLiveEvents();
  const list = [...events]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .filter((e) => tab === "all" || e.status === tab);
  return (
    <div className="tech-grid">
      <section className="mx-auto max-w-7xl px-5 py-20">
        <AnimatedContent trigger="mount" distance={50} blur={8}>
          <p className="tag-label">Fixtures</p>
          <h1 className="mt-3 text-6xl font-bold uppercase md:text-8xl">Events</h1>
        </AnimatedContent>
        <div className="mt-10 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`clip-diag px-5 py-2 font-display font-bold uppercase tracking-widest transition ${tab === t.key ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <AnimatedContent
          key={tab}
          trigger="mount"
          stagger={0.1}
          distance={60}
          className="mt-10 grid gap-6 md:grid-cols-3"
        >
          {list.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </AnimatedContent>
        {list.length === 0 && (
          <p className="mt-10 font-display uppercase tracking-widest text-muted-foreground">
            No events here yet.
          </p>
        )}
      </section>
    </div>
  );
}

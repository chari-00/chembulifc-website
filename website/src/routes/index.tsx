import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MapPin, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import WarpText from "@/components/bits/WarpText";
import AnimatedContent from "@/components/bits/AnimatedContent";
import Counter from "@/components/bits/Counter";
import { EventCard } from "@/components/site/EventCard";
import { formatDate, nextEvent } from "@/data/events";
import { useDB, useLiveEvents } from "@/lib/store";
import { ClientOnly } from "@tanstack/react-router";
import FlexCarousel from "@/components/bits/FlexCarousel";
import hero from "@/assets/hero-pitch.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chembuli FC — Built to Compete. Built to Play." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Official home of Chembuli FC. Discover tournaments, register your team and relive every match.",
      },
      { property: "og:title", content: "Chembuli FC — Built to Compete" },
      {
        property: "og:description",
        content: "Tournaments, team registration and the match archive of Chembuli FC.",
      },
    ],
  }),
  component: Home,
});

function useCountdown(target: string) {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, new Date(target).getTime() - Date.now());
      setLeft({
        d: Math.floor(ms / 864e5),
        h: Math.floor(ms / 36e5) % 24,
        m: Math.floor(ms / 6e4) % 60,
        s: Math.floor(ms / 1e3) % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

function Home() {
  const events = useLiveEvents();
  const { gallery } = useDB();
  const featured = nextEvent(events);
  const cd = useCountdown(featured?.date ?? new Date().toISOString());
  const spotsLeft = events
    .filter((e) => e.status !== "completed")
    .reduce((a, e) => a + Math.max(0, e.capacity - e.registered), 0);
  const active = [...events]
    .filter((e) => e.status !== "completed")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden">
        <img
          src={hero}
          alt=""
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 tech-grid opacity-60" />
        <div className="relative z-10 w-full max-w-7xl px-5 text-center">
          <AnimatedContent trigger="mount" distance={40} duration={1} blur={8}>
            <p className="tag-label">Football Club / Tournaments</p>
          </AnimatedContent>
          <div className="text-foreground">
            <WarpText
              text="CHEMBULI FC"
              warpStrength={0.08}
              warpScale={1.7}
              speed={0.55}
              lens="bulge"
              pointerInfluence={0.42}
              pointerStrength={0.38}
              refraction={0.018}
              chromatic={0.35}
              idleDrift={0.2}
              ripple
              clickRipple
              intro
              fontSize="clamp(3rem, 12vw, 10rem)"
              fontWeight={700}
              letterSpacing="0.02em"
              style={{ height: "clamp(160px, 26vw, 320px)" }}
            />
          </div>
          <AnimatedContent trigger="mount" delay={0.4} distance={30} stagger={0.12}>
            <h2 className="text-gold text-2xl font-bold uppercase tracking-[0.3em] md:text-4xl">
              Built to compete. Built to play.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/events"
                className="clip-diag inline-flex items-center gap-2 bg-primary px-8 py-4 font-display text-lg font-bold uppercase tracking-widest text-primary-foreground transition hover:glow"
              >
                View tournaments <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/gallery"
                className="clip-diag glass inline-flex items-center px-8 py-4 font-display text-lg font-bold uppercase tracking-widest transition hover:border-primary"
              >
                Explore gallery
              </Link>
            </div>
          </AnimatedContent>

          {featured && (
            <AnimatedContent trigger="mount" delay={0.8} distance={40}>
              <Link
                to="/events/$slug"
                params={{ slug: featured.slug }}
                className="mx-auto mt-14 flex w-fit"
              >
                <div className="inline-flex flex-wrap items-center justify-center gap-6 glass px-6 py-4">
                  <span className="tag-label">Next kick-off · {featured.name}</span>
                  <div className="flex gap-4 font-display">
                    {(["d", "h", "m", "s"] as const).map((k) => (
                      <div key={k} className="text-center">
                        <Counter
                          value={cd[k]}
                          minDigits={2}
                          fontSize={32}
                          fontWeight={700}
                          intro={false}
                        />
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {k}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            </AnimatedContent>
          )}
        </div>
      </section>

      {/* MARQUEE */}
      <div className="overflow-hidden border-y border-border bg-primary py-3">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-display text-xl font-bold uppercase tracking-widest text-primary-foreground">
          {Array.from({ length: 2 }).flatMap((_, i) =>
            ["Compete", "◆", "Unite", "◆", "Rise", "◆", "Chembuli FC", "◆", "Tournaments", "◆"].map(
              (w, j) => <span key={`${i}-${j}`}>{w}</span>,
            ),
          )}
        </div>
      </div>

      {/* STATS */}
      <section className="relative tech-grid">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border px-0 md:grid-cols-4">
          {[
            { icon: Trophy, v: events.length, l: "Tournaments hosted" },
            { icon: Users, v: events.reduce((a, e) => a + e.registered, 0), l: "Teams registered" },
            {
              icon: Calendar,
              v: events.filter((e) => e.status !== "completed").length,
              l: "Upcoming events",
            },
            { icon: MapPin, v: spotsLeft, l: "Spots still open" },
          ].map((s) => (
            <AnimatedContent key={s.l} distance={40}>
              <div className="bg-background p-8 md:p-12">
                <s.icon className="h-6 w-6 text-primary" />
                <div className="mt-4 font-display text-primary">
                  <Counter
                    value={s.v}
                    fontSize="clamp(2.5rem, 5vw, 4rem)"
                    fontWeight={700}
                    locale="en-IN"
                  />
                </div>
                <p className="mt-2 font-display text-sm uppercase tracking-widest text-muted-foreground">
                  {s.l}
                </p>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* TEAMS PER TOURNAMENT */}
      {active.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-20">
          <p className="tag-label">Teams registered by tournament</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map((e) => (
              <Link
                key={e.slug}
                to="/events/$slug"
                params={{ slug: e.slug }}
                className="glass block p-5 transition hover:border-primary"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-lg font-bold uppercase">{e.name}</span>
                  <span className="font-display text-primary">
                    {e.registered}/{e.capacity}
                  </span>
                </div>
                <div className="mt-3 h-1.5 bg-border">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, (e.registered / e.capacity) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {Math.max(0, e.capacity - e.registered)} spots left · {formatDate(e.date)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* INTRO */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-28 md:grid-cols-2">
        <AnimatedContent direction="horizontal" reverse distance={80} wipe="right">
          <p className="tag-label">01 — The Club</p>
          <h2 className="mt-4 text-5xl font-bold uppercase leading-[0.95] md:text-7xl">
            More than a club.
            <br />
            <span className="text-gold">A proving ground.</span>
          </h2>
        </AnimatedContent>
        <AnimatedContent stagger={0.15} distance={50}>
          <p className="text-lg text-muted-foreground">
            Chembuli FC brings local players together through competitive, well-run tournaments. We
            play with discipline, respect and hunger — on every pitch, every match.
          </p>
          <p className="text-lg text-muted-foreground">
            From seven-a-side cups to full-field knockouts, our events give every team a stage to
            compete.
          </p>
        </AnimatedContent>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="mx-auto max-w-7xl px-5 pb-28">
          <AnimatedContent distance={60} tilt={8}>
            <div className="clip-diag grid overflow-hidden border border-primary/40 bg-card md:grid-cols-2 glow">
              <img
                src={featured.poster}
                alt={featured.name}
                loading="lazy"
                width={1024}
                height={1280}
                className="h-full max-h-[560px] w-full object-cover"
              />
              <div className="flex flex-col justify-center gap-6 p-8 md:p-12">
                <p className="tag-label">
                  {featured.status === "open" ? "Registration open" : "Up next"} · {featured.format}
                </p>
                <h2 className="text-5xl font-bold uppercase leading-none md:text-6xl">
                  {featured.name}
                </h2>
                <p className="text-xl text-muted-foreground">{featured.tagline}</p>
                <dl className="grid grid-cols-2 gap-4 font-display">
                  {[
                    ["Date", formatDate(featured.date)],
                    ["Venue", featured.venue],
                    ["Entry fee", `₹${featured.fee.toLocaleString("en-IN")}`],
                    ["Closes", formatDate(featured.closes)],
                  ].map(([k, v]) => (
                    <div key={k} className="border-l-2 border-primary pl-3">
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="text-lg font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  to="/events/$slug"
                  params={{ slug: featured.slug }}
                  className="clip-diag inline-flex w-fit items-center gap-2 bg-primary px-8 py-4 font-display font-bold uppercase tracking-widest text-primary-foreground"
                >
                  View event <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </AnimatedContent>
        </section>
      )}

      {/* EVENTS GRID */}
      <section className="border-t border-border bg-card/40 py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="tag-label">02 — Fixtures</p>
              <h2 className="mt-3 text-5xl font-bold uppercase md:text-6xl">Tournaments</h2>
            </div>
            <Link
              to="/events"
              className="font-display uppercase tracking-widest text-primary hover:underline"
            >
              All events →
            </Link>
          </div>
          <AnimatedContent stagger={0.12} distance={80} className="grid gap-6 md:grid-cols-3">
            {[...events]
              .sort(
                (a, b) =>
                  (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0) ||
                  +new Date(a.date) - +new Date(b.date),
              )
              .slice(0, 3)
              .map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
          </AnimatedContent>
        </div>
      </section>

      {/* CULTURE / GALLERY PREVIEW */}
      <section className="mx-auto max-w-7xl px-5 py-28">
        <AnimatedContent distance={40} blur={10}>
          <p className="tag-label text-center">03 — Culture</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-center text-5xl font-bold uppercase leading-none md:text-7xl">
            The game is bigger <span className="text-gold">than the score.</span>
          </h2>
        </AnimatedContent>
        <div className="relative mt-16 h-[560px] w-full">
          <ClientOnly fallback={<div className="h-full w-full bg-card/40" />}>
            {gallery.length > 0 && (
              <FlexCarousel
                items={gallery.map((p) => ({ src: p.src, alt: p.title, title: p.title }))}
                preset="liquid"
                intro="rise"
                cardHeight={0.6}
                gap={12}
                squeeze={0.2}
                focusOnClick
                captions
                captureWheel={false}
              />
            )}
          </ClientOnly>
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/gallery"
            className="font-display uppercase tracking-widest text-primary hover:underline"
          >
            Open the archive →
          </Link>
        </div>
      </section>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, QrCode } from "lucide-react";
import AnimatedContent from "@/components/bits/AnimatedContent";
import Counter from "@/components/bits/Counter";
import {
  fillMessage,
  formatDate,
  seedEvents,
  statusLabel,
  generateColors,
  validVenueMap,
  confirmationMessageEnabled,
  type FormField,
} from "@/data/events";
import { addRegistration, fileToImage, update, useDB, useLiveEvents } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { sendRegistrationEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/events/$slug")({
  head: ({ params }) => {
    const e = seedEvents.find((x) => x.slug === params.slug);
    const title = e ? `${e.name} — Chembuli FC` : "Tournament — Chembuli FC";
    const desc = e
      ? `${e.tagline} ${e.format} at ${e.venue}.`
      : "Tournament details and team registration at Chembuli FC.";
    return {
      meta: [
        { title },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: EventPage,
});

const input =
  "w-full border border-input bg-background px-4 py-3 outline-none transition focus:border-primary";

function FieldInput({ f }: { f: FormField }) {
  const ph = f.label + (f.required ? " *" : "");
  if (f.type === "paragraph")
    return (
      <textarea
        name={f.id}
        required={f.required}
        className={input}
        placeholder={ph}
        maxLength={1000}
        rows={3}
      />
    );
  if (f.type === "select")
    return (
      <select
        name={f.id}
        required={f.required}
        className={`${input} [color-scheme:dark] [&_option]:bg-card [&_option]:text-foreground`}
        defaultValue=""
      >
        <option value="" disabled>
          {ph}
        </option>
        {f.options?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (f.type === "radio" || f.type === "checkbox")
    return (
      <fieldset className="border border-input p-4">
        <legend className="px-1 text-sm text-muted-foreground">{ph}</legend>
        <div className="flex flex-wrap gap-4">
          {f.options?.map((o, i) => (
            <label key={o} className="flex items-center gap-2">
              <input
                type={f.type}
                name={f.id}
                value={o}
                required={f.type === "radio" && f.required && i === 0}
                className="accent-primary"
              />{" "}
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  return (
    <input
      name={f.id}
      required={f.required}
      className={input}
      placeholder={ph}
      type={f.type}
      maxLength={f.type === "number" ? undefined : 200}
      pattern={f.type === "tel" ? "[0-9+ ]{10,15}" : undefined}
    />
  );
}

function EventPage() {
  const { slug } = Route.useParams();
  const events = useLiveEvents();
  const db = useDB();
  const event = events.find((e) => e.slug === slug);
  const [ref, setRef] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!event)
    return (
      <div className="mx-auto max-w-3xl px-5 py-32 text-center">
        <h1 className="text-5xl font-bold uppercase">Event not found</h1>
        <Link
          to="/events"
          className="mt-6 inline-block font-display uppercase tracking-widest text-primary"
        >
          ← All events
        </Link>
      </div>
    );

  const spots = Math.max(0, event.capacity - event.registered);
  const form = event.form;
  const taken = new Set(
    db.registrations.filter((r) => r.eventSlug === event.slug && r.color).map((r) => r.color),
  );
  const colors = generateColors(event.capacity);
  const schedule = event.schedule.filter((s) => s.time.trim() || s.label.trim());
  const sections = event.sections
    .map((sec) => ({ ...sec, items: sec.items.filter((i) => i.trim()) }))
    .filter((sec) => sec.items.length > 0);
  const freeColors = colors.filter((c) => !taken.has(c.name));
  const upiField = form.fields.find((f) => f.id === "upi");
  const otherFields = form.fields.filter((f) => f.id !== "upi");
  const canRegister = event.status === "open" && spots > 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string | string[]> = {};
    for (const f of form.fields) {
      values[f.id] =
        f.type === "checkbox" ? (fd.getAll(f.id) as string[]) : String(fd.get(f.id) ?? "").trim();
      if (f.type === "checkbox" && f.required && !(values[f.id] as string[]).length) {
        toast.error(`Please answer "${f.label}"`);
        return;
      }
    }
    const color = form.colorPicker ? String(fd.get("__color") ?? "") : undefined;
    let id: string;
    setBusy(true);
    try {
      const screenshot = fd.get("__paymentScreenshot");
      if (!(screenshot instanceof File) || !screenshot.size || !["image/jpeg", "image/png", "image/webp"].includes(screenshot.type)) {
        throw new Error("Please upload a JPG, PNG or WebP UPI Payment Screenshot.");
      }
      const image = await fileToImage(screenshot, 1800, 0.9);
      id = addRegistration(event.slug, values, color, image.src).ref;
    } catch (err) {
      setBusy(false);
      toast.error((err as Error).message);
      return;
    }
    setRef(id);
    const vars = {
      team: String(values["team"] ?? ""),
      captain: String(values["captain"] ?? ""),
      event: event.name,
      date: formatDate(event.date),
      venue: event.venue,
      ref: id,
      color: color ?? "",
      fee: `₹${event.fee.toLocaleString("en-IN")}`,
    };
    toast.success("Registration submitted", {
      description: `Reference ${id} — payment pending verification.`,
    });
    const email = String(values["email"] ?? "");
    if (email && confirmationMessageEnabled(form)) {
      try {
        const r = await sendRegistrationEmail({
          data: {
            to: email,
            toName: vars.captain,
            subject: fillMessage(form.message.subject, vars),
            text: fillMessage(form.message.body, vars),
          },
        });
        if (r.sent) {
          update((d) => ({
            ...d,
            registrations: d.registrations.map((x) =>
              x.eventSlug === event.slug && x.ref === id ? { ...x, emailSent: true } : x,
            ),
          }));
          toast.success("Confirmation sent to your email");
        }
      } catch {
        /* email is best-effort */
      }
    }
    setBusy(false);
  }

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={event.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="relative mx-auto max-w-7xl px-5 py-24">
          <AnimatedContent trigger="mount" stagger={0.1} distance={40}>
            <Link
              to="/events"
              className="font-display text-sm uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              ← All events
            </Link>
            <p className="tag-label mt-6">
              {statusLabel[event.status]} · {event.format}
            </p>
            <h1 className="mt-2 text-6xl font-bold uppercase leading-none md:text-8xl">
              {event.name}
            </h1>
            <p className="text-gold mt-4 text-2xl font-display font-bold uppercase tracking-widest">
              {event.tagline}
            </p>
          </AnimatedContent>
          <div
            className={`mt-12 grid max-w-3xl gap-px bg-border ${event.trophy.trim() ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}
          >
            {[
              { v: event.fee, l: "Entry ₹" },
              { v: spots, l: "Spots left" },
            ].map((s) => (
              <div key={s.l} className="bg-background/90 p-5">
                <div className="font-display text-primary">
                  <Counter
                    value={s.v}
                    fontSize="clamp(1.75rem,4vw,3rem)"
                    fontWeight={700}
                    locale="en-IN"
                  />
                </div>
                <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                  {s.l}
                </p>
              </div>
            ))}
            {event.trophy.trim() && (
              <div className="bg-background/90 p-5">
                <div className="font-display text-xl font-bold uppercase leading-tight text-primary md:text-2xl">
                  {event.trophy}
                </div>
                <p className="mt-1 font-display text-xs uppercase tracking-widest text-muted-foreground">
                  Trophy
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr]">
        <AnimatedContent stagger={0.12} distance={50}>
          <div className="glass p-6">
            <h2 className="text-2xl font-bold uppercase">Details</h2>
            <dl className="mt-4 space-y-3">
              {[
                ["Date", formatDate(event.date)],
                ["Venue", event.venue],
                ["Registration closes", formatDate(event.closes)],
                ["Capacity", `${event.capacity} teams`],
              ].map(([k, v]) => (
                <div key={k}>
                <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
                {k === "Venue" && event.venueMap && validVenueMap(event.venueMap) && (
                  <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3">
                    <dt className="text-muted-foreground">Venue map location</dt>
                    <dd><a href={event.venueMap} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">Open Google Maps ↗</a></dd>
                  </div>
                )}
                </div>
              ))}
            </dl>
          </div>
          {schedule.length > 0 && (
            <div className="glass p-6">
              <h2 className="text-2xl font-bold uppercase">Schedule</h2>
              <ol className="mt-4 space-y-3">
                {schedule.map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-display font-bold text-primary">{s.time}</span>
                    {s.label}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {sections.map((sec) => (
            <div key={sec.id} className="glass p-6">
              <h2 className="text-2xl font-bold uppercase">{sec.title}</h2>
              <ul className="mt-4 space-y-2">
                {sec.items.map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-primary">◆</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </AnimatedContent>

        <AnimatedContent distance={60} delay={0.15}>
          <div className="clip-diag border border-primary/40 bg-card p-8 glow">
            {ref ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
                <h2 className="mt-4 text-4xl font-bold uppercase">You're in the draw</h2>
                <p className="mt-2 text-muted-foreground">Reference ID</p>
                <p className="font-display text-3xl font-bold tracking-widest text-primary">
                  {ref}
                </p>
                <p className="mt-6 text-sm text-muted-foreground">
                  Payment status: pending verification. The club will confirm your spot shortly.
                </p>
              </div>
            ) : !canRegister ? (
              <div className="py-10 text-center">
                <h2 className="text-3xl font-bold uppercase">
                  {event.status === "completed"
                    ? "Registration closed"
                    : event.status === "open"
                      ? "All spots filled"
                      : "Registration opens soon"}
                </h2>
                <p className="mt-2 text-muted-foreground">Check back for updates from the club.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <p className="tag-label">Team registration</p>
                <h2 className="text-4xl font-bold uppercase">{form.title}</h2>
                {form.description && (
                  <p className="whitespace-pre-line text-muted-foreground">{form.description}</p>
                )}
                {otherFields.map((f) => (
                  <FieldInput key={f.id} f={f} />
                ))}
                {form.colorPicker && colors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      Team color * ({freeColors.length} left)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => {
                        const isTaken = taken.has(c.name);
                        return (
                          <label
                            key={c.name}
                            className={`flex items-center gap-2 border border-input px-3 py-2 text-sm ${isTaken ? "cursor-not-allowed opacity-30 line-through" : "cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/10"}`}
                          >
                            <input
                              type="radio"
                              name="__color"
                              value={c.name}
                              disabled={isTaken}
                              required
                              className="sr-only"
                            />
                            <span
                              className="h-4 w-4 rounded-full border border-border"
                              style={{ background: c.hex }}
                            />
                            {c.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-5 border border-dashed border-primary/50 p-5">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden bg-foreground text-background">
                    {form.qr ? (
                      <img
                        src={form.qr}
                        alt="UPI payment QR code"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <QrCode className="h-20 w-20" />
                    )}
                  </div>
                  <div>
                    <p className="font-display font-bold uppercase tracking-widest">
                      Pay ₹{event.fee.toLocaleString("en-IN")} via UPI
                    </p>
                    {form.upiId && <p className="mt-1 font-display text-primary">{form.upiId}</p>}
                    <p className="mt-1 text-sm text-muted-foreground">
                      Scan the QR, then enter your UPI transaction reference below.
                    </p>
                  </div>
                </div>
                {upiField && <FieldInput f={upiField} />}
                <label className="block space-y-2" htmlFor="payment-screenshot">
                  <span className="text-sm text-muted-foreground">UPI Payment Screenshot *</span>
                  <input
                    id="payment-screenshot"
                    name="__paymentScreenshot"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    disabled={busy}
                    className={`${input} text-sm file:mr-3 file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground`}
                  />
                </label>
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input required type="checkbox" className="mt-1 accent-primary" /> I agree to the
                  tournament rules and refund policy.
                </label>
                <Button
                  type="submit"
                  disabled={busy}
                  className="clip-diag w-full bg-primary py-4 font-display text-lg font-bold uppercase tracking-widest text-primary-foreground transition hover:glow disabled:opacity-60"
                >
                  {busy ? "Submitting…" : "Submit registration"}
                </Button>
              </form>
            )}
          </div>
        </AnimatedContent>
      </section>
    </div>
  );
}


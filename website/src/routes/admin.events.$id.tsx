import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Download, History, Mail, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  blankEvent,
  eventStatus,
  fillMessage,
  generateColors,
  slugify,
  statusLabel,
  uid,
  validVenueMap,
  validPaymentScreenshot,
  confirmationMessageEnabled,
  canConfirmRegistration,
  type ClubEvent,
  type FieldType,
  type FormField,
} from "@/data/events";
import { fileToImage, update, useDB, logAdminAction, fetchReferenceHistory, deleteRegistration, type ReferenceHistoryEntry } from "@/lib/store";
import { sendRegistrationEmail } from "@/lib/email.functions";
import { exportRegistrationsToCsv } from "@/lib/csv-export";
import { pageHead } from "@/lib/page-head";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/events/$id")({
  head: () => pageHead("Edit Tournament — Chembuli FC Admin", "Edit event details, team registration forms and registrations.", true),
  component: EditorPage,
});

const input =
  "w-full border border-input bg-background px-3 py-2 outline-none focus:border-primary";
const selectCls = `${input} [color-scheme:dark] [&_option]:bg-card [&_option]:text-foreground`;
const btn = "flex items-center gap-2 border border-input px-3 py-2 text-sm hover:border-primary";

const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => new Date(v).toISOString();

const typeLabels: Record<FieldType, string> = {
  text: "Short answer",
  paragraph: "Paragraph",
  email: "Email",
  tel: "Phone",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  radio: "Multiple choice",
  checkbox: "Checkboxes",
};

function EditorPage() {
  const { id } = Route.useParams();
  const db = useDB();
  const existing = db.events.find((e) => e.slug === id);
  if (id !== "new" && !existing)
    return (
      <p>
        Event not found.{" "}
        <Link to="/admin" className="text-primary">
          Back
        </Link>
      </p>
    );
  return <Editor key={id} initial={existing ?? blankEvent()} isNew={id === "new"} />;
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold uppercase">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{text}</span>
      {children}
    </label>
  );
}

function Editor({ initial, isNew }: { initial: ClubEvent; isNew: boolean }) {
  const [ev, setEv] = useState<ClubEvent>(initial);
  const [tab, setTab] = useState<"details" | "form" | "regs">("details");
  const navigate = useNavigate();
  const db = useDB();
  const regs = db.registrations.filter((r) => r.eventSlug === initial.slug && !isNew);
  const set = (p: Partial<ClubEvent>) => setEv((e) => ({ ...e, ...p }));
  const setForm = (p: Partial<ClubEvent["form"]>) =>
    setEv((e) => ({ ...e, form: { ...e.form, ...p } }));
  const setField = (i: number, p: Partial<FormField>) =>
    setForm({ fields: ev.form.fields.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  const [refHistory, setRefHistory] = useState<ReferenceHistoryEntry[]>([]);

  useEffect(() => {
    if (!isNew && initial.slug) {
      fetchReferenceHistory({ eventSlug: initial.slug })
        .then((res) => setRefHistory(res.entries))
        .catch(() => {});
    }
  }, [initial.slug, isNew]);

  async function upload(file: File | undefined, cb: (src: string) => void, maxW = 1400) {
    if (!file) return;
    try {
      cb((await fileToImage(file, maxW)).src);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function save() {
    if (!ev.name.trim()) return toast.error("Event name is required");
    if (!ev.venue.trim()) return toast.error("Venue is required");
    if (!validVenueMap(ev.venueMap ?? "")) return toast.error("Enter a valid HTTPS Google Maps link.");
    if (new Date(ev.closes) > new Date(ev.date))
      return toast.error("Registration must close before the event date");
    let slug = initial.slug;
    if (isNew) {
      const base = slugify(ev.name) || "event";
      slug = base;
      let n = 2;
      while (db.events.some((e) => e.slug === slug)) slug = `${base}-${n++}`;
    }
    const final = { ...ev, slug };
    try {
      await update((d) => ({
        ...d,
        events: isNew ? [...d.events, final] : d.events.map((e) => (e.slug === slug ? final : e)),
      }));
      logAdminAction(
        isNew ? "event.create" : "event.update",
        "event",
        final.slug,
        isNew ? `Created tournament "${final.name}"` : `Updated tournament details for "${final.name}"`,
        { name: final.name, date: final.date, closes: final.closes, fee: final.fee, capacity: final.capacity }
      ).catch(() => {});
    } catch (e) {
      return toast.error((e as Error).message);
    }
    toast.success(isNew ? "Event created" : "Changes saved");
    if (isNew) navigate({ to: "/admin/events/$id", params: { id: slug }, replace: true });
    return undefined;
  }

  const status = eventStatus(ev);
  const takenColors = new Set(regs.map((r) => r.color).filter(Boolean));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary">
            ← All events
          </Link>
          <h1 className="text-4xl font-bold uppercase">
            {isNew ? "New event" : ev.name || "Untitled"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Status: {statusLabel[status]} (completed automatically after the event date)
          </p>
        </div>
        <div className="flex gap-3">
          {!isNew && (
            <Link
              to="/events/$slug"
              params={{ slug: initial.slug }}
              target="_blank"
              className={btn}
            >
              View page ↗
            </Link>
          )}
          <button
            onClick={save}
            className="clip-diag bg-primary px-6 py-3 font-display font-bold uppercase tracking-widest text-primary-foreground"
          >
            {isNew ? "Create event" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["details", "Event page"],
            ["form", "Registration form"],
            ["regs", `Registrations (${regs.length})`],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`clip-diag px-5 py-2 font-display font-bold uppercase tracking-widest ${tab === k ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Basics">
            <Label text="Event name">
              <input
                className={input}
                value={ev.name}
                maxLength={80}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Label>
            <Label text="Short description / tagline">
              <textarea
                className={input}
                rows={2}
                value={ev.tagline}
                maxLength={300}
                onChange={(e) => set({ tagline: e.target.value })}
              />
            </Label>
            <Label text="Format">
              <input
                className={input}
                value={ev.format}
                maxLength={40}
                onChange={(e) => set({ format: e.target.value })}
              />
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <Label text="Entry cost (₹)">
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={ev.fee}
                  onChange={(e) => set({ fee: +e.target.value })}
                />
              </Label>
              <Label text="Trophy">
                <input
                  className={input}
                  value={ev.trophy}
                  maxLength={80}
                  placeholder="e.g. Gold cup + medals"
                  onChange={(e) => set({ trophy: e.target.value })}
                />
              </Label>
              <Label text="Total spots">
                <input
                  type="number"
                  min={1}
                  max={256}
                  className={input}
                  value={ev.capacity}
                  onChange={(e) => {
                    const capacity = Math.max(1, +e.target.value || 1);
                    setEv((x) => ({
                      ...x,
                      capacity,
                      form: { ...x.form, colors: generateColors(capacity) },
                    }));
                  }}
                />
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Spots left = total spots − registered teams ({regs.length} registered).
            </p>
          </Card>

          <Card title="Wallpaper">
            <img src={ev.poster} alt="" className="aspect-[4/3] w-full object-cover" />
            <label className={`${btn} w-fit cursor-pointer`}>
              <Upload className="h-4 w-4" /> Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => upload(e.target.files?.[0], (src) => set({ poster: src }))}
              />
            </label>
          </Card>

          <Card title="Details">
            <Label text="Event date & time">
              <input
                type="datetime-local"
                className={input}
                value={toLocal(ev.date)}
                onChange={(e) => e.target.value && set({ date: fromLocal(e.target.value) })}
              />
            </Label>
            <Label text="Registration closes">
              <input
                type="datetime-local"
                className={input}
                value={toLocal(ev.closes)}
                onChange={(e) => e.target.value && set({ closes: fromLocal(e.target.value) })}
              />
            </Label>
            <Label text="Venue">
              <input
                className={input}
                value={ev.venue}
                maxLength={100}
                onChange={(e) => set({ venue: e.target.value })}
              />
            </Label>
            <Label text="Venue map location (Google Maps link)">
              <input type="url" className={input} value={ev.venueMap ?? ""} placeholder="https://maps.app.goo.gl/…" onChange={(e) => set({ venueMap: e.target.value.trim() })} />
            </Label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="accent-primary"
                checked={ev.registrationOpen}
                onChange={(e) => set({ registrationOpen: e.target.checked })}
              />
              Registration open (otherwise shows "Coming soon")
            </label>
          </Card>

          <Card
            title="Schedule (optional)"
            action={
              <button
                className={btn}
                onClick={() => set({ schedule: [...ev.schedule, { time: "", label: "" }] })}
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            }
          >
            {ev.schedule.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="time"
                  className={`${input} w-32`}
                  value={s.time}
                  onChange={(e) =>
                    set({
                      schedule: ev.schedule.map((x, j) =>
                        j === i ? { ...x, time: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  className={input}
                  placeholder="What happens"
                  value={s.label}
                  onChange={(e) =>
                    set({
                      schedule: ev.schedule.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <button
                  aria-label="Remove"
                  onClick={() => set({ schedule: ev.schedule.filter((_, j) => j !== i) })}
                  className="px-2 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </Card>

          <div className="space-y-6 lg:col-span-2">
            {ev.sections.map((sec, si) => {
              const setSec = (p: Partial<typeof sec>) =>
                set({ sections: ev.sections.map((x, j) => (j === si ? { ...x, ...p } : x)) });
              return (
                <Card
                  key={sec.id}
                  title={sec.title || "Section"}
                  action={
                    <button
                      onClick={() => set({ sections: ev.sections.filter((_, j) => j !== si) })}
                      className={btn}
                    >
                      <Trash2 className="h-4 w-4" /> Remove section
                    </button>
                  }
                >
                  <Label text="Section title">
                    <input
                      className={input}
                      value={sec.title}
                      onChange={(e) => setSec({ title: e.target.value })}
                    />
                  </Label>
                  {sec.items.map((it, ii) => (
                    <div key={ii} className="flex gap-2">
                      <input
                        className={input}
                        value={it}
                        onChange={(e) =>
                          setSec({
                            items: sec.items.map((x, j) => (j === ii ? e.target.value : x)),
                          })
                        }
                      />
                      <button
                        aria-label="Remove"
                        onClick={() => setSec({ items: sec.items.filter((_, j) => j !== ii) })}
                        className="px-2 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button className={btn} onClick={() => setSec({ items: [...sec.items, ""] })}>
                    <Plus className="h-4 w-4" /> Add point
                  </button>
                </Card>
              );
            })}
            <button
              className={btn}
              onClick={() =>
                set({
                  sections: [...ev.sections, { id: uid(), title: "New section", items: [""] }],
                })
              }
            >
              <Plus className="h-4 w-4" /> Add extra section (like Rules, Prizes, FAQ) — empty
              sections are hidden on the site
            </button>
          </div>
        </div>
      )}

      {tab === "form" && (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="border-t-8 border-primary bg-card p-6">
            <input
              className="w-full bg-transparent text-3xl font-bold uppercase outline-none"
              value={ev.form.title}
              onChange={(e) => setForm({ title: e.target.value })}
            />
            <textarea
              className="mt-2 w-full bg-transparent text-muted-foreground outline-none"
              rows={2}
              value={ev.form.description}
              placeholder="Form description"
              onChange={(e) => setForm({ description: e.target.value })}
            />
          </div>

          {ev.form.fields.map((f, i) => {
            const hasOptions = f.type === "select" || f.type === "radio" || f.type === "checkbox";
            return (
              <div key={f.id} className="border-l-4 border-primary/60 bg-card p-6">
                <div className="flex flex-wrap gap-3">
                  <input
                    className={`${input} flex-1`}
                    value={f.label}
                    placeholder="Question"
                    onChange={(e) => setField(i, { label: e.target.value })}
                  />
                  {f.locked ? (
                    <span className="flex w-48 items-center border border-border px-3 py-2 text-sm text-muted-foreground">
                      {typeLabels[f.type]}
                    </span>
                  ) : (
                    <select
                      className={`${selectCls} w-48`}
                      value={f.type}
                      onChange={(e) => {
                        const type = e.target.value as FieldType;
                        setField(i, {
                          type,
                          options: ["select", "radio", "checkbox"].includes(type)
                            ? f.options?.length
                              ? f.options
                              : ["Option 1"]
                            : undefined,
                        });
                      }}
                    >
                      {Object.entries(typeLabels).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {hasOptions && (
                  <div className="mt-4 space-y-2">
                    {(f.options ?? []).map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {f.type === "checkbox" ? "☐" : f.type === "radio" ? "○" : `${oi + 1}.`}
                        </span>
                        <input
                          className={input}
                          value={o}
                          onChange={(e) =>
                            setField(i, {
                              options: f.options!.map((x, j) => (j === oi ? e.target.value : x)),
                            })
                          }
                        />
                        <button
                          aria-label="Remove option"
                          onClick={() =>
                            setField(i, { options: f.options!.filter((_, j) => j !== oi) })
                          }
                          className="px-2 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-sm text-primary"
                      onClick={() =>
                        setField(i, {
                          options: [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`],
                        })
                      }
                    >
                      + Add option
                    </button>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-end gap-4 border-t border-border pt-3 text-sm">
                  {f.locked && (
                    <span className="mr-auto text-xs uppercase tracking-widest text-muted-foreground">
                      Standard field
                    </span>
                  )}
                  <button
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => {
                      const fs = [...ev.form.fields];
                      [fs[i - 1], fs[i]] = [fs[i]!, fs[i - 1]!];
                      setForm({ fields: fs });
                    }}
                    className="disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Move down"
                    disabled={i === ev.form.fields.length - 1}
                    onClick={() => {
                      const fs = [...ev.form.fields];
                      [fs[i + 1], fs[i]] = [fs[i]!, fs[i + 1]!];
                      setForm({ fields: fs });
                    }}
                    className="disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  {!f.locked && (
                    <button
                      aria-label="Duplicate"
                      onClick={() => {
                        const fs = [...ev.form.fields];
                        fs.splice(i + 1, 0, { ...f, id: uid() });
                        setForm({ fields: fs });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                  {!f.locked && (
                    <button
                      aria-label="Delete question"
                      onClick={() => setForm({ fields: ev.form.fields.filter((_, j) => j !== i) })}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <label className="flex items-center gap-2">
                    Required{" "}
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={f.required}
                      onChange={(e) => setField(i, { required: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          <button
            className={btn}
            onClick={() =>
              setForm({
                fields: [
                  ...ev.form.fields,
                  { id: uid(), label: "Untitled question", type: "text", required: false },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Add question
          </button>

          <Card title="UPI payment">
            <div className="border border-border px-3 py-2 text-sm">
              UPI Payment Screenshot <span className="text-muted-foreground">· Required image upload</span>
            </div>
            <div className="flex gap-5">
              <div className="flex h-36 w-36 shrink-0 items-center justify-center border border-dashed border-input bg-background">
                {ev.form.qr ? (
                  <img src={ev.form.qr} alt="UPI QR" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No QR yet</span>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <label className={`${btn} w-fit cursor-pointer`}>
                  <Upload className="h-4 w-4" /> Upload QR code
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      upload(e.target.files?.[0], (src) => setForm({ qr: src }), 600)
                    }
                  />
                </label>
                {ev.form.qr && (
                  <button
                    className="text-sm text-destructive"
                    onClick={() => setForm({ qr: null })}
                  >
                    Remove QR
                  </button>
                )}
                <Label text="UPI ID (optional)">
                  <input
                    className={input}
                    value={ev.form.upiId}
                    placeholder="club@upi"
                    onChange={(e) => setForm({ upiId: e.target.value })}
                  />
                </Label>
              </div>
            </div>
          </Card>

          <Card
            title="Team colors"
            action={
              <label className="flex items-center gap-2 text-sm" htmlFor="team-colors-switch">
                {ev.form.colorPicker ? "On" : "Off"}
                <Switch
                  id="team-colors-switch"
                  aria-label="Team colors"
                  checked={ev.form.colorPicker}
                  onCheckedChange={(checked) => setForm({ colorPicker: checked })}
                />
              </label>
            }
          >
            {ev.form.colorPicker && <>
            <p className="text-sm text-muted-foreground">
              Each team picks one basic color — once taken, no other team can choose it. The list
              offers {ev.form.colors.length} choices for {ev.capacity} spots (five extra choices,
              capped at the available basic palette)
              {ev.capacity > ev.form.colors.length
                ? ` (only ${ev.form.colors.length} basic colors exist, so extra teams won't get a color)`
                : ""}
              .
            </p>
            <div className="flex flex-wrap gap-2">
              {ev.form.colors.map((c) => (
                <span
                  key={c.name}
                  className={`flex items-center gap-2 border border-input px-3 py-1.5 text-sm ${takenColors.has(c.name) ? "opacity-40 line-through" : ""}`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ background: c.hex }}
                  />
                  {c.name}
                </span>
              ))}
            </div>
            </>}
          </Card>

          <Card title="Confirmation message" action={
            <label className="flex items-center gap-2 text-sm" htmlFor="confirmation-message-switch">
              {confirmationMessageEnabled(ev.form) ? "On" : "Off"}
              <Switch id="confirmation-message-switch" aria-label="Confirmation message"
                checked={confirmationMessageEnabled(ev.form)}
                onCheckedChange={(checked) => setForm({ messageEnabled: checked })} />
            </label>
          }>
            {confirmationMessageEnabled(ev.form) && <>
            <p className="text-sm text-muted-foreground">
              Sent to the team's email when they submit. Placeholders:{" "}
              {"{team} {captain} {event} {date} {venue} {ref} {color} {fee}"}. WhatsApp delivery
              will be added once the club's WhatsApp Business account is connected.
            </p>
            <Label text="Subject">
              <input
                className={input}
                value={ev.form.message.subject}
                onChange={(e) =>
                  setForm({ message: { ...ev.form.message, subject: e.target.value } })
                }
              />
            </Label>
            <Label text="Message">
              <textarea
                className={input}
                rows={7}
                value={ev.form.message.body}
                onChange={(e) => setForm({ message: { ...ev.form.message, body: e.target.value } })}
              />
            </Label>
            </>}
          </Card>
          <button
            onClick={save}
            className="clip-diag w-full bg-primary py-3 font-display font-bold uppercase tracking-widest text-primary-foreground"
          >
            Save form
          </button>
        </div>
      )}

      {tab === "regs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4">
            <div>
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
                Registered Teams ({regs.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {regs.length} of {ev.capacity} spots filled ({Math.max(0, ev.capacity - regs.length)} remaining)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={regs.length === 0}
              title={regs.length === 0 ? "No registrations to export" : "Export registrations to CSV"}
              onClick={() => {
                if (regs.length === 0) return;
                exportRegistrationsToCsv(ev, regs);
                toast.success(`Exported ${regs.length} registration${regs.length === 1 ? "" : "s"} to CSV`);
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
          </div>

          {regs.length === 0 ? (
            <p className="border border-border bg-card p-6 text-muted-foreground">
              No registrations yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regs.map((r) => (
              <details
                key={r.id}
                className="group border border-border bg-card open:border-primary open:sm:col-span-2 open:lg:col-span-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                  <span className="flex items-center gap-3">
                    {ev.form.colorPicker && r.color && (
                      <span
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ background: ev.form.colors.find((c) => c.name === r.color)?.hex }}
                      />
                    )}
                    <span className="text-2xl font-bold uppercase">
                      {String(r.values["team"] ?? "Unnamed team")}
                    </span>
                  </span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground group-open:text-primary">
                    {r.ref}
                  </span>
                </summary>
                <dl className="grid gap-3 border-t border-border p-5 text-sm sm:grid-cols-2">
                  {ev.form.fields.map((f) => (
                    <div key={f.id}>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        {f.label}
                      </dt>
                      <dd>{[r.values[f.id] ?? "—"].flat().join(", ") || "—"}</dd>
                    </div>
                  ))}
                  {ev.form.colorPicker && (
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Color
                      </dt>
                      <dd>{r.color ?? "—"}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">UPI Payment Screenshot</dt>
                    <dd className="mt-2">
                      {validPaymentScreenshot(r.paymentScreenshot) ? (
                        <a href={r.paymentScreenshot} download={`${r.ref}-payment.jpg`} className="block w-fit" title="Download payment screenshot">
                          <img src={r.paymentScreenshot} alt={`UPI Payment Screenshot for ${String(r.values["team"] ?? "team")}`} className="max-h-96 max-w-full border border-border object-contain" />
                        </a>
                      ) : <span className="text-muted-foreground">Not provided</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                      Registered
                    </dt>
                    <dd>{new Date(r.createdAt).toLocaleString("en-IN")}</dd>
                  </div>
                  {confirmationMessageEnabled(ev.form) && <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                      Email
                    </dt>
                    <dd>{r.emailSent ? "Sent" : "Not sent"}</dd>
                  </div>}
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                      Reference ID
                    </dt>
                    <dd className="flex items-center gap-2 font-mono text-primary">
                      {r.ref}
                      <button
                        title="Copy reference ID"
                        onClick={() => {
                          navigator.clipboard.writeText(r.ref);
                          toast.success("Reference ID copied");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                      Status
                    </dt>
                    <dd>
                      {r.confirmed
                        ? `Confirmed${r.confirmedAt ? ` · ${new Date(r.confirmedAt).toLocaleString("en-IN")}` : ""}`
                        : "Pending confirmation"}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {confirmationMessageEnabled(ev.form) && <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirmationMessageEnabled(ev.form)) return;
                        const to = String(r.values["email"] ?? "");
                        if (!to) { toast.error("This team has no email address"); return; }
                        const vars = {
                          team: String(r.values["team"] ?? ""),
                          captain: String(r.values["captain"] ?? ""),
                          event: ev.name,
                          date: new Date(ev.date).toLocaleString("en-IN"),
                          venue: ev.venue,
                          ref: r.ref,
                          color: r.color ?? "",
                          fee: `₹${ev.fee.toLocaleString("en-IN")}`,
                        };
                        try {
                          const res = await sendRegistrationEmail({
                            data: {
                              to,
                              toName: vars.captain,
                              subject: fillMessage(ev.form.message.subject, vars),
                              text: fillMessage(ev.form.message.body, vars),
                            },
                          });
                          if (!res.sent) { toast.error(res.reason ?? "Email not sent"); return; }
                          await update((d) => ({
                            ...d,
                            registrations: d.registrations.map((x) =>
                              x.id === r.id ? { ...x, emailSent: true } : x,
                            ),
                          }));
                          logAdminAction(
                            "registration.email",
                            "registration",
                            r.id,
                            `Sent confirmation email to team "${r.values["team"] ?? "Unnamed"}" (${r.ref})`,
                            { ref: r.ref, to, eventSlug: ev.slug }
                          ).catch(() => {});
                          toast.success(`Email sent to ${to}`);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      className={btn}
                    >
                      <Mail className="h-4 w-4" /> {r.emailSent ? "Resend email" : "Send email"}
                    </Button>}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={!canConfirmRegistration(ev.form, r)}
                        title={confirmationMessageEnabled(ev.form) && !r.emailSent ? "Send confirmation email first" : undefined}
                        onClick={async () => {
                          if (!canConfirmRegistration(ev.form, r)) return;
                          try {
                            await update((d) => ({
                              ...d,
                              registrations: d.registrations.map((x) =>
                                x.id === r.id
                                  ? { ...x, confirmed: true, confirmedAt: new Date().toISOString() }
                                  : x,
                              ),
                            }));
                            logAdminAction(
                              "registration.confirm",
                              "registration",
                              r.id,
                              `Confirmed registration for team "${r.values["team"] ?? "Unnamed"}" (${r.ref})`,
                              { ref: r.ref, team: r.values["team"], eventSlug: ev.slug }
                            ).catch(() => {});
                            toast.success("Registration confirmed");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        className={`${btn} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {r.confirmed ? "Registration confirmed" : "Confirm registration"}
                      </Button>
                      {!r.confirmed && confirmationMessageEnabled(ev.form) && !r.emailSent && (
                        <span className="text-xs text-muted-foreground italic">
                          (Send confirmation email first)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this registration? Its spot and color become free.")) return;
                        try {
                          await deleteRegistration(r.id);
                          logAdminAction(
                            "registration.delete",
                            "registration",
                            r.id,
                            `Deleted registration for team "${r.values["team"] ?? "Unnamed"}" (${r.ref})`,
                            { ref: r.ref, team: r.values["team"], eventSlug: ev.slug }
                          ).catch(() => {});
                          toast.success("Registration deleted");
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      className={`${btn} hover:text-destructive`}
                    >
                      <Trash2 className="h-4 w-4" /> Delete registration
                    </button>
                  </div>
                </dl>
              </details>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Reference Creation Audit Trail Section (Per-Tournament Secondary Audit) */}
      {tab === "regs" && !isNew && (
        <div className="border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
                  Reference Creation Audit Trail
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanent record of all CFC reference IDs issued for this tournament (independent of registration status).
              </p>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 bg-muted border border-border text-foreground font-semibold">
              {refHistory.length} Total Issued
            </span>
          </div>

          {refHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 italic">
              No references recorded for this tournament yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 uppercase tracking-wider font-display text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Reference Code</th>
                    <th className="p-2.5">Issued At</th>
                    <th className="p-2.5">Registration Doc ID</th>
                    <th className="p-2.5">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {refHistory.map((entry) => {
                    const activeMatch = regs.find((r) => r.ref === entry.ref);
                    return (
                      <tr key={entry.id} className="hover:bg-muted/10">
                        <td className="p-2.5 font-bold text-primary font-mono">{entry.ref}</td>
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="p-2.5 text-muted-foreground/80">{entry.registrationId}</td>
                        <td className="p-2.5 font-sans">
                          {activeMatch ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-primary/20 text-primary border border-primary/30">
                              Active: {String(activeMatch.values["team"] ?? "Team")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground border border-border">
                              Deleted / Historic
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
